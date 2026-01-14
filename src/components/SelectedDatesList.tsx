// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import type { Signal } from "@preact/signals";

export function SelectedDatesList(props: {
  normalizedDates: Signal<string[]>;
  selectedDateCount: Signal<number>;
  onToggleDate: (date: string) => void;
}) {
  return (
    <div class="col-md-5">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <span class="form-label mb-0">Selected dates</span>
        <span class="small text-muted">{props.selectedDateCount} selected</span>
      </div>
      <div class="d-flex flex-wrap gap-2">
        {props.normalizedDates.value.length === 0 ? (
          <span class="small text-muted">Pick dates to continue.</span>
        ) : (
          props.normalizedDates.value.map((date) => (
            <button
              key={date}
              type="button"
              class="btn btn-outline-secondary btn-sm"
              aria-label={`Remove ${date}`}
              onClick={() => {
                props.onToggleDate(date);
              }}
            >
              {date}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
