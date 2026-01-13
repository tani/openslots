import { Temporal } from "@js-temporal/polyfill";
import type { NDKEvent, NDKSubscription } from "@nostr-dev-kit/ndk";
import { useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { Grid } from "../components/Grid";
import { Sidebar } from "../components/Sidebar";
import {
  clearResponses,
  currentSelections,
  responses,
  setSelections,
} from "../signals/store";
import { publishResponse, subscribeToRoom } from "../utils/nostr";
import { toLocalDate, toLocalDisplay } from "../utils/temporal";

function tagValue(tags: string[][], key: string): string | null {
  const hit = tags.find((tag) => tag[0] === key);
  return hit?.[1] ?? null;
}

function buildGrid(options: string[], tz: string) {
  const dates = new Map<string, Temporal.PlainDate>();
  const times = new Map<string, Temporal.PlainTime>();
  const slotByLocalKey = new Map<string, string>();

  for (const epoch of options) {
    const localDate = toLocalDate(epoch, tz);
    const localTime = toLocalDisplay(epoch, tz);
    const dateKey = localDate.toString();
    const timeKey = localTime.toString().slice(0, 5);
    dates.set(dateKey, localDate);
    times.set(timeKey, localTime);
    slotByLocalKey.set(`${dateKey}|${timeKey}`, epoch);
  }

  const dateList = Array.from(dates.entries())
    .sort((a, b) => Temporal.PlainDate.compare(a[1], b[1]))
    .map(([key]) => key);
  const timeList = Array.from(times.entries())
    .sort((a, b) => Temporal.PlainTime.compare(a[1], b[1]))
    .map(([key]) => key);

  return { dateList, timeList, slotByLocalKey };
}

export function JoinRoom(props: { id?: string }) {
  const currentRoomId = useSignal(props.id ?? "");
  // Sync prop to signal
  currentRoomId.value = props.id ?? "";

  const roomResource = useSignal<{
    root: NDKEvent;
    sub: NDKSubscription;
  } | null>(null);
  const status = useSignal<"loading" | "ready" | "missing">("loading");
  const name = useSignal(
    localStorage.getItem("when2nostr_user_name") ?? "Anonymous",
  );
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useSignalEffect(() => {
    localStorage.setItem("when2nostr_user_name", name.value);
  });

  // Intensive Signal Sync: React to roomId changes
  useSignalEffect(() => {
    const rId = currentRoomId.value;
    let activeSub: { stop: () => void } | null = null;

    // Reset global store for the new room
    clearResponses();
    setSelections(new Set());
    roomResource.value = null;

    if (!rId) {
      status.value = "missing";
      return;
    }

    status.value = "loading";
    subscribeToRoom(rId).then((result) => {
      // Guard against stale requests
      if (currentRoomId.value !== rId) return;

      if (!result) {
        status.value = "missing";
        return;
      }

      roomResource.value = result;
      activeSub = result.sub;
      status.value = "ready";
    });

    return () => activeSub?.stop();
  });

  // Derived signals
  const rootId = useComputed(() => roomResource.value?.root.id ?? null);
  const title = useComputed(() => {
    if (status.value === "loading") return "Syncing...";
    if (status.value === "missing") return "Room not found";
    return (
      tagValue(roomResource.value?.root.tags ?? [], "title") ??
      "Untitled Meeting"
    );
  });

  const optionsList = useComputed(() => {
    const raw = tagValue(roomResource.value?.root.tags ?? [], "options") ?? "";
    return raw.split(",").filter(Boolean);
  });

  const grid = useComputed(() => buildGrid(optionsList.value, tz));
  const selectedCount = useComputed(() => currentSelections.value.size);
  const participantList = useComputed(() =>
    Array.from(responses.value.entries()).map(([pubkey, entry]) => (
      <div class="d-flex align-items-center justify-content-between" key={pubkey}>
        <span>{entry.name}</span>
        <span class="text-muted">{entry.slots.size}</span>
      </div>
    )),
  );

  const handlePublish = async () => {
    if (!rootId.value) return;
    await publishResponse({
      rootId: rootId.value,
      name: name.value,
      slots: Array.from(currentSelections.value),
    });
  };

  if (status.value === "missing") {
    return (
      <main class="container py-5 text-center">
        <h1 class="display-4 fw-bold text-dark mb-3">Room not found</h1>
        <p class="lead text-muted">Double-check the link or create a new room.</p>
      </main>
    );
  }

  return (
    <main class="container py-4">
      <header class="mb-4 pb-3 border-bottom">
        <h1 class="display-5 fw-bold text-dark mb-2">{title}</h1>
        <p class="text-muted mb-0">Timezone: {tz}</p>
      </header>

      {status.value === "loading" ? (
        <p class="text-muted fst-italic">Synchronizing with Nostr relays...</p>
      ) : (
        <div class="row g-4">
          <div class="col-lg-9">
            <Grid
              dates={grid.value.dateList}
              times={grid.value.timeList}
              slotByLocalKey={grid.value.slotByLocalKey}
            />
          </div>
          <div class="col-lg-3">
            <Sidebar title="Your response">
              <div class="mb-3">
                <label class="form-label" htmlFor="input-name">Name</label>
                <input
                  id="input-name"
                  class="form-control"
                  value={name}
                  onInput={(e) => {
                    name.value = e.currentTarget.value;
                  }}
                />
              </div>
              <div class="small text-muted mb-3">
                Selected {selectedCount} slots
              </div>
              <button
                type="button"
                class="btn btn-success w-100 fw-bold mb-4"
                onClick={handlePublish}
              >
                Publish availability
              </button>
              <div class="d-grid gap-2">
                <div class="small text-uppercase fw-bold text-muted" style="letter-spacing: 0.1em;">
                  Participants
                </div>
                <div class="small">{participantList}</div>
              </div>
            </Sidebar>
          </div>
        </div>
      )}
    </main>
  );
}
