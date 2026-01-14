// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { useSignal, useSignalEffect } from "@preact/signals";
import {
  currentSelections,
  heatmap,
  participantCount,
  updateSelection,
} from "../signals/store";
import { Slot } from "./Slot";

export function Grid(props: {
  dates: string[];
  times: string[];
  slotByLocalKey: Map<string, string>;
}) {
  const dragging = useSignal(false);
  const dragMode = useSignal<"add" | "remove">("add");

  useSignalEffect(() => {
    const stop = () => {
      dragging.value = false;
    };
    window.addEventListener("mouseup", stop);
    return () => {
      window.removeEventListener("mouseup", stop);
    };
  });

  const handleMouseDown = (slotId: string) => {
    const isSelected = currentSelections.value.has(slotId);
    dragMode.value = isSelected ? "remove" : "add";
    dragging.value = true;
    updateSelection(slotId, !isSelected);
  };

  const handleMouseEnter = (slotId: string) => {
    if (!dragging.value) return;
    updateSelection(slotId, dragMode.value === "add");
  };

  return (
    <div class="overflow-auto border rounded-3 bg-white shadow-sm">
      <div
        class="px-3 py-2 border-bottom bg-white"
        style="position: sticky; left: 0; right: 0; z-index: 4;"
      >
        <div class="small fw-semibold text-dark">
          Drag to paint your availability.
        </div>
        <div class="small text-muted">
          Darker green means more participants can make that slot.
        </div>
      </div>
      <div
        class="d-grid"
        style={{
          gridTemplateColumns: `120px repeat(${props.dates.length}, minmax(140px, 1fr))`,
        }}
      >
        <div
          class="sticky-top bg-white bg-opacity-75 px-3 py-2 small fw-bold border-bottom border-end"
          style="backdrop-filter: blur(4px); z-index: 3; left: 0;"
        >
          Time
        </div>
        {props.dates.map((date) => (
          <div
            class="sticky-top bg-white bg-opacity-75 px-3 py-2 small fw-bold border-bottom"
            style="backdrop-filter: blur(4px); z-index: 2;"
            key={date}
          >
            {date}
          </div>
        ))}

        {props.times.map((time, timeIndex) => {
          const rowShade = timeIndex % 2 === 0;
          const rowShadeClass = rowShade ? " bg-light" : "";

          return (
            <div style={{ display: "contents" }} key={time}>
              <div
                class={`px-3 py-1 small text-muted border-bottom border-light border-end${rowShadeClass}`}
                style="position: sticky; left: 0; z-index: 1;"
              >
              {time}
              </div>
              {props.dates.map((date) => {
                const slotId = props.slotByLocalKey.get(`${date}|${time}`);
                if (!slotId) {
                  return (
                    <div
                      key={`${date}-${time}`}
                      class={`border-bottom border-light${rowShadeClass}`}
                      style={{ height: "1.5rem" }}
                    />
                  );
                }

                return (
                  <Slot
                    key={slotId}
                    slotId={slotId}
                    rowShade={rowShade}
                    heatmap={heatmap}
                    participantCount={participantCount}
                    currentSelections={currentSelections}
                    onMouseDown={handleMouseDown}
                    onMouseEnter={handleMouseEnter}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
