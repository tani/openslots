import { Temporal } from "@js-temporal/polyfill";
import { useEffect, useMemo, useState } from "preact/hooks";
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
  const roomId = props.id ?? "";
  const [rootId, setRootId] = useState<string | null>(null);
  const [title, setTitle] = useState("Loading...");
  const [options, setOptions] = useState<string[]>([]);
  const [name, setName] = useState("Anonymous");
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    "loading",
  );
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    let active = true;
    let activeSub: { stop: () => void } | null = null;
    clearResponses();
    setSelections(new Set());

    if (!roomId) {
      setStatus("missing");
      return () => {
        active = false;
      };
    }

    subscribeToRoom(roomId).then((result) => {
      if (!active) return;
      if (!result) {
        setStatus("missing");
        return;
      }

      const { root } = result;
      activeSub = result.sub;
      const rawOptions = tagValue(root.tags, "options") ?? "";
      const rawTitle = tagValue(root.tags, "title") ?? "Meeting";
      setRootId(root.id);
      setTitle(rawTitle);
      setOptions(rawOptions.split(",").filter(Boolean));
      setStatus("ready");
    });

    return () => {
      active = false;
      activeSub?.stop();
    };
  }, [roomId]);

  const grid = useMemo(() => buildGrid(options, tz), [options, tz]);

  const handlePublish = async () => {
    if (!rootId) return;
    await publishResponse({
      rootId,
      name,
      slots: Array.from(currentSelections.value),
    });
  };

  if (status === "missing") {
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

      {status === "loading" ? (
        <p class="text-ink/70">Syncing with relays...</p>
      ) : (
        <div class="grid lg:grid-cols-[1fr_18rem] gap-6">
          <Grid
            dates={grid.dateList}
            times={grid.timeList}
            slotByLocalKey={grid.slotByLocalKey}
          />
          <Sidebar title="Your response">
            <label class="grid gap-2 text-sm">
              Name
              <input
                class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
                value={name}
                onInput={(event) => setName(event.currentTarget.value)}
              />
            </label>
            <div class="text-xs text-ink/60">
              Selected {currentSelections.value.size} slots
            </div>
            <button
              type="button"
              class="w-full py-2 rounded-lg bg-moss text-white font-semibold"
              onClick={handlePublish}
            >
              Publish availability
            </button>
            <div>
              <div class="text-xs uppercase tracking-[0.2em] text-ink/50">
                Participants
              </div>
              <div class="mt-2 space-y-1 text-sm">
                {Array.from(responses.value.entries()).map(
                  ([pubkey, entry]) => (
                    <div class="flex items-center justify-between" key={pubkey}>
                      <span>{entry.name}</span>
                      <span class="text-ink/60">{entry.slots.size}</span>
                    </div>
                  ),
                )}
              </div>
            </div>
          </Sidebar>
        </div>
      )}
    </main>
  );
}
