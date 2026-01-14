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
  const count = useComputed(
    () => props.heatmap.value.get(props.slotId) ?? 0,
  );
  const selected = useComputed(() =>
    props.currentSelections.value.has(props.slotId),
  );
  const total = useComputed(() => props.participantCount.value || 1);

  const background = useComputed(() => {
    const opacity = total.value > 0 ? count.value / total.value : 0;
    if (selected.value) {
      return "rgba(34, 197, 94, 0.8)";
    }
    const baseOpacity =
      count.value === 0
        ? props.rowShade
          ? 0.06
          : 0.03
        : Math.max(0.12, opacity);
    const baseColor = count.value === 0 ? "15, 23, 42" : "34, 197, 94";
    return `rgba(${baseColor}, ${baseOpacity})`;
  });

  return (
    <button
      type="button"
      class="slot-button"
      style={{ background: background.value }}
      onMouseDown={() => props.onMouseDown(props.slotId)}
      onMouseEnter={() => props.onMouseEnter(props.slotId)}
    />
  );
}
