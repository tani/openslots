// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { Temporal } from "@js-temporal/polyfill";
import { useComputed, useSignal } from "@preact/signals";
import { useLocation } from "preact-iso";
import { AppHeader } from "../components/AppHeader";
import { publishRoom } from "../utils/nostr";
import { generateSlots } from "../utils/temporal";

export function CreateRoom() {
  const location = useLocation();
  const today = Temporal.Now.plainDateISO();
  const title = useSignal("Meeting");
  const startDate = useSignal(today.toString());
  const endDate = useSignal(today.add({ days: 6 }).toString());
  const startTime = useSignal("09:00");
  const endTime = useSignal("18:00");
  const tz = useSignal(Intl.DateTimeFormat().resolvedOptions().timeZone);
  const loading = useSignal(false);

  const dayCount = useComputed(() => {
    try {
      const start = Temporal.PlainDate.from(startDate.value);
      const end = Temporal.PlainDate.from(endDate.value);
      if (Temporal.PlainDate.compare(end, start) < 0) return 0;
      return start.until(end, { largestUnit: "days" }).days + 1;
    } catch {
      return 0;
    }
  });

  const totalSlots = useComputed(() => {
    try {
      // Very rough estimate of slots based on time range and days
      const start = Temporal.PlainTime.from(startTime.value);
      const end = Temporal.PlainTime.from(endTime.value);
      const diffMinutes =
        end.hour * 60 + end.minute - (start.hour * 60 + start.minute);
      if (diffMinutes <= 0) return 0;
      return Math.floor(diffMinutes / 30) * dayCount.value;
    } catch {
      return 0;
    }
  });

  const handleCreate = async (event: Event) => {
    event.preventDefault();
    loading.value = true;

    try {
      const plainStart = Temporal.PlainDate.from(startDate.value);
      const count = dayCount.value;
      const options: string[] = [];
      for (let i = 0; i < count; i += 1) {
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
              <h1 class="display-4 fw-bold text-dark mb-3">
                Secure Scheduling <br />
                Without Accounts
              </h1>
              <p class="lead text-muted">
                OpenSlots runs entirely in your browser. It generates a room key
                client-side, encrypts the schedule, and publishes only blinded
                ciphertext to Nostr relays. This project is open source for
                transparency, and the code is available at{" "}
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
                <div class="col-md-6">
                  <label class="form-label" htmlFor="input-start-date">
                    Start date
                  </label>
                  <input
                    id="input-start-date"
                    type="date"
                    class="form-control"
                    value={startDate}
                    onInput={(e) => {
                      startDate.value = e.currentTarget.value;
                    }}
                  />
                </div>
                <div class="col-md-6">
                  <label class="form-label" htmlFor="input-end-date">
                    End date
                  </label>
                  <input
                    id="input-end-date"
                    type="date"
                    class="form-control"
                    value={endDate}
                    onInput={(e) => {
                      endDate.value = e.currentTarget.value;
                    }}
                  />
                </div>
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
                Preview: {totalSlots} slots will be encoded and encrypted.
              </div>

              <button
                type="submit"
                class="btn btn-primary btn-lg w-100 fw-bold"
                disabled={loading}
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
