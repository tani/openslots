import { Temporal } from "@js-temporal/polyfill";
import { useState } from "preact/hooks";
import { useLocation } from "preact-iso";
import { publishRoom } from "../utils/nostr";
import { generateSlots } from "../utils/temporal";

export function CreateRoom() {
  const location = useLocation();
  const today = Temporal.Now.plainDateISO();
  const [title, setTitle] = useState("Meeting");
  const [startDate, setStartDate] = useState(today.toString());
  const [days, setDays] = useState(7);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [tz, setTz] = useState(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  const [loading, setLoading] = useState(false);

  const handleCreate = async (event: Event) => {
    event.preventDefault();
    setLoading(true);

    const plainStart = Temporal.PlainDate.from(startDate);
    const options: string[] = [];
    for (let i = 0; i < days; i += 1) {
      const day = plainStart.add({ days: i });
      options.push(...generateSlots(day.toString(), startTime, endTime, tz));
    }

    const roomId = crypto.randomUUID();
    await publishRoom({ roomId, title, options });
    location.route(`/room/${roomId}`);
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
            onInput={(event) => setTitle(event.currentTarget.value)}
          />
        </label>

        <div class="grid md:grid-cols-2 gap-4">
          <label class="grid gap-2 text-sm">
            Start date
            <input
              type="date"
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={startDate}
              onInput={(event) => setStartDate(event.currentTarget.value)}
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
              onInput={(event) => setDays(Number(event.currentTarget.value))}
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
              onInput={(event) => setStartTime(event.currentTarget.value)}
            />
          </label>
          <label class="grid gap-2 text-sm">
            End time
            <input
              type="time"
              class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
              value={endTime}
              onInput={(event) => setEndTime(event.currentTarget.value)}
            />
          </label>
        </div>

        <label class="grid gap-2 text-sm">
          Timezone
          <input
            class="px-3 py-2 rounded-lg border border-ink/20 bg-white"
            value={tz}
            onInput={(event) => setTz(event.currentTarget.value)}
          />
        </label>

        <button
          type="submit"
          class="py-3 rounded-xl bg-moss text-white font-semibold disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Publishing..." : "Create room"}
        </button>
      </form>
    </main>
  );
}
