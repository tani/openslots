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
    <div class="overflow-auto border border-ink/20 rounded-xl bg-paper">
      <div
        class="grid"
        style={{
          gridTemplateColumns: `120px repeat(${props.dates.length}, minmax(140px, 1fr))`,
        }}
      >
        <div class="sticky top-0 bg-paper/90 backdrop-blur-sm z-10 px-3 py-2 text-sm font-semibold border-b border-ink/10">
          Time
        </div>
        {props.dates.map((date) => (
          <div
            class="sticky top-0 bg-paper/90 backdrop-blur-sm z-10 px-3 py-2 text-sm font-semibold border-b border-ink/10"
            key={date}
          >
            {date}
          </div>
        ))}

        {props.times.map((time) => (
          <div class="contents" key={time}>
            <div class="px-3 py-1 text-xs text-ink/70 border-b border-ink/10">
              {time}
            </div>
            {props.dates.map((date) => {
              const slotId = props.slotByLocalKey.get(`${date}|${time}`);
              if (!slotId) {
                return (
                  <div
                    key={`${date}-${time}`}
                    class="h-6 border-b border-ink/10 bg-sand/30"
                  />
                );
              }

              return (
                <Slot
                  key={slotId}
                  slotId={slotId}
                  heatmap={heatmap}
                  participantCount={participantCount}
                  currentSelections={currentSelections}
                  onMouseDown={handleMouseDown}
                  onMouseEnter={handleMouseEnter}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
