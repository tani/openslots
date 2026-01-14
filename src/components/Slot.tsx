// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { type ReadonlySignal, type Signal, useComputed } from "@preact/signals";

export function Slot(props: {
  slotId: string;
  rowShade?: boolean;
  heatmap: ReadonlySignal<Map<string, number>>;
  participantCount: ReadonlySignal<number>;
  currentSelections: Signal<Set<string>>;
  onMouseDown: (id: string) => void;
  onMouseEnter: (id: string) => void;
}) {
  const count = useComputed(() => props.heatmap.value.get(props.slotId) ?? 0);
  const selected = useComputed(() =>
    props.currentSelections.value.has(props.slotId),
  );
  const total = useComputed(() => props.participantCount.value || 1);

  const background = useComputed(() => {
    const intensity = total.value > 0 ? count.value / total.value : 0;
    if (selected.value) {
      return "rgba(22, 163, 74, 0.85)";
    }
    const baseOpacity =
      count.value === 0
        ? props.rowShade
          ? 0.08
          : 0.04
        : 0.2 + 0.5 * Math.min(1, intensity);
    const baseColor = count.value === 0 ? "15, 23, 42" : "22, 163, 74";
    return `rgba(${baseColor}, ${baseOpacity})`;
  });

  const handleHighlight = (event: MouseEvent | FocusEvent) => {
    const target = event.currentTarget as HTMLButtonElement | null;
    if (target) {
      target.style.borderColor = "rgba(17, 18, 15, 0.3)";
    }
  };

  const handleUnhighlight = (event: MouseEvent | FocusEvent) => {
    const target = event.currentTarget as HTMLButtonElement | null;
    if (target) {
      target.style.borderColor = "rgba(17, 18, 15, 0.1)";
    }
  };

  return (
    <button
      type="button"
      class="w-100"
      style={{
        height: "1.5rem",
        border: "1px solid rgba(17, 18, 15, 0.1)",
        cursor: "pointer",
        transition: "all 0.2s",
        background: background.value,
      }}
      onFocus={handleHighlight}
      onBlur={handleUnhighlight}
      onMouseDown={() => props.onMouseDown(props.slotId)}
      onMouseEnter={(event) => {
        handleHighlight(event);
        props.onMouseEnter(props.slotId);
      }}
      onMouseLeave={handleUnhighlight}
    />
  );
}
