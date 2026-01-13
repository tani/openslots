export function Slot(props: {
  slotId: string;
  count: number;
  total: number;
  selected: boolean;
  onMouseDown: (id: string) => void;
  onMouseEnter: (id: string) => void;
}) {
  const opacity = props.total > 0 ? props.count / props.total : 0;
  const background = props.selected
    ? "rgba(34, 197, 94, 0.8)"
    : `rgba(34, 197, 94, ${opacity})`;

  return (
    <button
      type="button"
      class="w-full h-6 border border-ink/10"
      style={{ background }}
      onMouseDown={() => props.onMouseDown(props.slotId)}
      onMouseEnter={() => props.onMouseEnter(props.slotId)}
    />
  );
}
