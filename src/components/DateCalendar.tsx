// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { Temporal } from "@js-temporal/polyfill";
import type { Signal } from "@preact/signals";

type CalendarDays = {
  leadingEmpty: number;
  days: string[];
};

export function DateCalendar(props: {
  monthLabel: Signal<string>;
  calendarDays: Signal<CalendarDays>;
  selectedDateSet: Signal<Set<string>>;
  selectedDateCount: Signal<number>;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  onToggleDate: (date: string) => void;
  onClearDates: () => void;
}) {
  return (
    <div class="col-md-7">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="form-label mb-0">Dates</span>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          disabled={props.selectedDateCount.value === 0}
          onClick={props.onClearDates}
        >
          Clear dates
        </button>
      </div>
      <div class="d-flex align-items-center justify-content-between mb-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          aria-label="Previous month"
          onClick={props.onPrevMonth}
        >
          Prev
        </button>
        <span class="small fw-semibold">{props.monthLabel}</span>
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          aria-label="Next month"
          onClick={props.onNextMonth}
        >
          Next
        </button>
      </div>
      <div class="d-grid gap-2">
        <div
          class="d-grid text-center small text-muted"
          style="grid-template-columns: repeat(7, minmax(0, 1fr));"
        >
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>
        <div
          class="d-grid gap-2"
          style="grid-template-columns: repeat(7, minmax(0, 1fr));"
        >
          {Array.from({
            length: props.calendarDays.value.leadingEmpty,
          }).map((_, index) => (
            <div key={`empty-${index}`} />
          ))}
          {props.calendarDays.value.days.map((date) => {
            const isSelected = props.selectedDateSet.value.has(date);
            return (
              <button
                key={date}
                type="button"
                class={`btn btn-sm ${
                  isSelected ? "btn-primary" : "btn-outline-secondary"
                }`}
                style={{
                  aspectRatio: "1.618 / 1",
                  padding: "0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "clamp(0.7rem, 2.2vw, 0.95rem)",
                  lineHeight: "1",
                }}
                aria-label={`Toggle date ${date}`}
                aria-pressed={isSelected}
                onClick={() => {
                  props.onToggleDate(date);
                }}
              >
                {Temporal.PlainDate.from(date).day}
              </button>
            );
          })}
        </div>
        {props.selectedDateCount.value === 0 ? (
          <span class="small text-muted">No dates selected.</span>
        ) : null}
      </div>
    </div>
  );
}
