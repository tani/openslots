import { type ReadonlySignal, type Signal, useComputed } from "@preact/signals";

export function Slot(props: {
  slotId: string;
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
    const opacity = total.value > 0 ? count.value / total.value : 0;
    return selected.value
      ? "rgba(34, 197, 94, 0.8)"
      : `rgba(34, 197, 94, ${opacity})`;
  });

  return (
    <button
      type="button"
      class="w-full h-6 border border-ink/10"
      style={{ background: background.value }}
      onMouseDown={() => props.onMouseDown(props.slotId)}
      onMouseEnter={() => props.onMouseEnter(props.slotId)}
    />
  );
}
