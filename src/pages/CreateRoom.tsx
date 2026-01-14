// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { Temporal } from "@js-temporal/polyfill";
import { useComputed, useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { AppHeader } from "../components/AppHeader";
import { DateCalendar } from "../components/DateCalendar";
import { SelectedDatesList } from "../components/SelectedDatesList";
import { publishRoom } from "../utils/nostr";
import { generateSlots } from "../utils/temporal";

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function CreateRoom() {
  const location = useLocation();
  const today = Temporal.Now.plainDateISO();
  const title = useSignal("Meeting");
  const selectedDates = useSignal(
    new Set<string>(
      Array.from({ length: 7 }, (_, index) =>
        today.add({ days: index }).toString(),
      ),
    ),
  );
  const visibleMonth = useSignal(today.with({ day: 1 }));
  const startTime = useSignal("09:00");
  const endTime = useSignal("18:00");
  const tz = useSignal(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const loading = useSignal(false);

  const normalizedDates = useComputed(() =>
    Array.from(selectedDates.value)
      .filter((value) => ISO_DATE_PATTERN.test(value))
      .sort(),
  );

  const selectedDateSet = useComputed(
    () => new Set<string>(normalizedDates.value),
  );

  const selectedDateCount = useComputed(() => normalizedDates.value.length);

  const slotsPerDay = useComputed(() => {
    try {
      const start = Temporal.PlainTime.from(startTime.value);
      const end = Temporal.PlainTime.from(endTime.value);
      const diffMinutes =
        end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
      if (diffMinutes <= 0) return 0;
      return Math.floor(diffMinutes / 30);
    } catch {
      return 0;
    }
  });

  const monthLabel = useComputed(() => {
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return `${monthNames[visibleMonth.value.month - 1]} ${visibleMonth.value.year}`;
  });

  const calendarDays = useComputed(() => {
    const firstDay = visibleMonth.value;
    const leadingEmpty = firstDay.dayOfWeek - 1;
    const days = Array.from({ length: firstDay.daysInMonth }, (_, index) =>
      firstDay.with({ day: index + 1 }).toString(),
    );
    return { leadingEmpty, days };
  });

  const totalSlots = useComputed(
    () => slotsPerDay.value * selectedDateCount.value,
  );

  const canPublish = useComputed(
    () => selectedDateCount.value > 0 && totalSlots.value > 0,
  );

  const toggleDate = (value: string) => {
    const next = new Set(selectedDates.value);
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    selectedDates.value = next;
  };

  const clearDates = () => {
    selectedDates.value = new Set();
  };

  const handleCreate = async (event: Event) => {
    event.preventDefault();
    if (!canPublish.value) return;
    loading.value = true;

    try {
      const options: string[] = [];
      for (const date of normalizedDates.value) {
        options.push(
          ...generateSlots(date, startTime.value, endTime.value, tz.value),
        );
      }

      const roomId = crypto.randomUUID();
      const keyBytes = new Uint8Array(32);
      crypto.getRandomValues(keyBytes);
      const roomKey = Array.from(keyBytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      await publishRoom({ roomId, title: title.value, options, roomKey });
      location.route(`/room/${roomId}#${roomKey}`);
    } finally {
      loading.value = false;
    }
  };

  return (
    <div>
      <AppHeader />
      <main class="container py-5">
        <div class="row justify-content-center">
          <div class="col-lg-8">
            <section class="mb-4 text-center">
              <h1 class="display-4 fw-bold text-dark mb-3">OpenSlots</h1>
              <p class="lead text-muted">
                OpenSlots runs entirely in your browser. It creates a room key
                on your device, encrypts the schedule, and publishes only
                blinded ciphertext to Nostr relays. The project is open source
                for transparency, and the technical details are available at{" "}
                <a href="https://github.com/tani/openslots">
                  https://github.com/tani/openslots
                </a>
                .
              </p>
            </section>

            <form class="card p-4" onSubmit={handleCreate}>
              <div class="mb-3">
                <label class="form-label" htmlFor="input-title">
                  Title
                </label>
                <input
                  id="input-title"
                  class="form-control"
                  value={title}
                  onInput={(e) => {
                    title.value = e.currentTarget.value;
                  }}
                />
              </div>

              <div class="row g-3 mb-3">
                <DateCalendar
                  monthLabel={monthLabel}
                  calendarDays={calendarDays}
                  selectedDateSet={selectedDateSet}
                  selectedDateCount={selectedDateCount}
                  onPrevMonth={() => {
                    visibleMonth.value = visibleMonth.value.subtract({
                      months: 1,
                    });
                  }}
                  onNextMonth={() => {
                    visibleMonth.value = visibleMonth.value.add({
                      months: 1,
                    });
                  }}
                  onToggleDate={toggleDate}
                  onClearDates={clearDates}
                />
                <SelectedDatesList
                  normalizedDates={normalizedDates}
                  selectedDateCount={selectedDateCount}
                  onToggleDate={toggleDate}
                />
              </div>

              <div class="row g-3 mb-3">
                <div class="col-md-6">
                  <label class="form-label" htmlFor="input-start-time">
                    Start time
                  </label>
                  <input
                    id="input-start-time"
                    type="time"
                    class="form-control"
                    value={startTime}
                    onInput={(e) => {
                      startTime.value = e.currentTarget.value;
                    }}
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label" htmlFor="input-end-time">
                    End time
                  </label>
                  <input
                    id="input-end-time"
                    type="time"
                    class="form-control"
                    value={endTime}
                    onInput={(e) => {
                      endTime.value = e.currentTarget.value;
                    }}
                  />
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" htmlFor="input-tz">
                  Timezone
                </label>
                <select
                  id="input-tz"
                  class="form-select"
                  value={tz}
                  onChange={(e) => {
                    tz.value = e.currentTarget.value;
                  }}
                >
                  {Intl.supportedValuesOf("timeZone").map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div class="form-text text-muted mb-3 fst-italic">
                Preview: {totalSlots} slots across {selectedDateCount} dates.
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-lg w-100 fw-bold"
                disabled={loading || !canPublish.value}
              >
                {loading.value ? "Publishing..." : "Create room"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
