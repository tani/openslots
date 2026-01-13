import { Temporal } from "@js-temporal/polyfill";
import { useComputed, useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { publishRoom } from "../utils/nostr";
import { generateSlots } from "../utils/temporal";

export function CreateRoom() {
  const location = useLocation();
  const today = Temporal.Now.plainDateISO();
  const title = useSignal("Meeting");
  const startDate = useSignal(today.toString());
  const days = useSignal(7);
  const startTime = useSignal("09:00");
  const endTime = useSignal("18:00");
  const tz = useSignal(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const loading = useSignal(false);

  const totalSlots = useComputed(() => {
    try {
      // Very rough estimate of slots based on time range and days
      const start = Temporal.PlainTime.from(startTime.value);
      const end = Temporal.PlainTime.from(endTime.value);
      const diffMinutes =
        end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
      if (diffMinutes <= 0) return 0;
      return Math.floor(diffMinutes / 15) * days.value;
    } catch {
      return 0;
    }
  });

  const handleCreate = async (event: Event) => {
    event.preventDefault();
    loading.value = true;

    try {
      const plainStart = Temporal.PlainDate.from(startDate.value);
      const options: string[] = [];
      for (let i = 0; i < days.value; i += 1) {
        const day = plainStart.add({ days: i });
        options.push(
          ...generateSlots(
            day.toString(),
            startTime.value,
            endTime.value,
            tz.value,
          ),
        );
      }

      const roomId = crypto.randomUUID();
      await publishRoom({ roomId, title: title.value, options });
      location.route(`/room/${roomId}`);
    } finally {
      loading.value = false;
    }
  };

  return (
    <main class="px-6 py-10 space-y-8">
      <section class="max-w-3xl space-y-3">
        <h1 class="text-4xl font-semibold text-ink">
          Schedule without the server.
        </h1>
        <p class="text-ink/70">
          Create a room, share the link, and let the grid live forever on Nostr
          relays.
        </p>
      </section>

      <form
        class="max-w-3xl grid gap-4 bg-paper border border-ink/20 rounded-2xl p-6"
        onSubmit={handleCreate}
      >
        <label class="grid gap-2 text-sm">
          Title
          <input
            class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
            value={title}
            onInput={(e) => {
              title.value = e.currentTarget.value;
            }}
          />
        </label>

        <div class="grid md:grid-cols-2 gap-4">
          <label class="grid gap-2 text-sm">
            Start date
            <input
              type="date"
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={startDate}
              onInput={(e) => {
                startDate.value = e.currentTarget.value;
              }}
            />
          </label>
          <label class="grid gap-2 text-sm">
            Days
            <input
              type="number"
              min={1}
              max={30}
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={days}
              onInput={(e) => {
                days.value = Number(e.currentTarget.value);
              }}
            />
          </label>
        </div>

        <div class="grid md:grid-cols-2 gap-4">
          <label class="grid gap-2 text-sm">
            Start time
            <input
              type="time"
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={startTime}
              onInput={(e) => {
                startTime.value = e.currentTarget.value;
              }}
            />
          </label>
          <label class="grid gap-2 text-sm">
            End time
            <input
              type="time"
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={endTime}
              onInput={(e) => {
                endTime.value = e.currentTarget.value;
              }}
            />
          </label>
        </div>

        <label class="grid gap-2 text-sm">
          Timezone
          <input
            class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
            value={tz}
            onInput={(e) => {
              tz.value = e.currentTarget.value;
            }}
          />
        </label>

        <div class="text-xs text-ink/60 italic">
          Preview: This will generate {totalSlots} time slots.
        </div>

        <button
          type="submit"
          class="py-3 rounded-xl bg-moss text-white font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading.value ? "Publishing..." : "Create room"}
        </button>
      </form>
    </main>
  );
}
