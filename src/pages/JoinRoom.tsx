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
      <div class="flex items-center justify-between" key={pubkey}>
        <span>{entry.name}</span>
        <span class="text-ink/60">{entry.slots.size}</span>
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
      <main class="px-6 py-10">
        <h1 class="text-2xl font-semibold text-ink">Room not found</h1>
        <p class="text-ink/70">Double-check the link or create a new room.</p>
      </main>
    );
  }

  return (
    <main class="px-6 py-8 space-y-6">
      <header class="space-y-2">
        <h1 class="text-3xl font-semibold text-ink">{title}</h1>
        <p class="text-sm text-ink/70">Timezone: {tz}</p>
      </header>

      {status.value === "loading" ? (
        <p class="text-ink/70 italic">Synchronizing with Nostr relays...</p>
      ) : (
        <div class="grid lg:grid-cols-[1fr_18rem] gap-6">
          <Grid
            dates={grid.value.dateList}
            times={grid.value.timeList}
            slotByLocalKey={grid.value.slotByLocalKey}
          />
          <Sidebar title="Your response">
            <label class="grid gap-2 text-sm">
              Name
              <input
                class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
                value={name}
                onInput={(e) => {
                  name.value = e.currentTarget.value;
                }}
              />
            </label>
            <div class="text-xs text-ink/60">
              Selected {selectedCount} slots
            </div>
            <button
              type="button"
              class="w-full py-2 rounded-lg bg-moss text-white font-semibold"
              onClick={handlePublish}
            >
              Publish availability
            </button>
            <div class="space-y-3">
              <div class="text-xs uppercase tracking-[0.2em] text-ink/50">
                Participants
              </div>
              <div class="space-y-1 text-sm">{participantList}</div>
            </div>
          </Sidebar>
        </div>
      )}
    </main>
  );
}
