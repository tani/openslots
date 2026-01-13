/// <reference lib="dom" />
import { expect, mock, test } from "bun:test";
import { signal } from "@preact/signals";
import { fireEvent, render } from "@testing-library/preact";
import { Slot } from "../src/components/Slot";

test("Slot handles mouse events", () => {
  const onMouseDown = mock((_id: string) => {});
  const onMouseEnter = mock((_id: string) => {});

  const heatmap = signal(new Map([["slot-1", 1]]));
  const participantCount = signal(2);
  const currentSelections = signal(new Set<string>());

  const { container } = render(
    <Slot
      slotId="slot-1"
      heatmap={heatmap}
      participantCount={participantCount}
      currentSelections={currentSelections}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    />,
  );

  const button = container.querySelector("button");
  if (!button) throw new Error("button not found");
  fireEvent.mouseDown(button);
  expect(onMouseDown).toHaveBeenCalledWith("slot-1");

  fireEvent.mouseEnter(button);
  expect(onMouseEnter).toHaveBeenCalledWith("slot-1");
});

test("Slot background changes based on selection", () => {
  const heatmap1 = signal(new Map([["s1", 0]]));
  const participantCount1 = signal(1);
  const currentSelections1 = signal(new Set(["s1"]));

  const { container: selectedContainer } = render(
    <Slot
      slotId="s1"
      heatmap={heatmap1}
      participantCount={participantCount1}
      currentSelections={currentSelections1}
      onMouseDown={() => {}}
      onMouseEnter={() => {}}
    />,
  );
  expect(selectedContainer.querySelector("button")?.style.background).toBe(
    "rgba(34, 197, 94, 0.8)",
  );

  const heatmap2 = signal(new Map([["s2", 1]]));
  const participantCount2 = signal(2);
  const currentSelections2 = signal(new Set<string>());

  const { container: unselectedContainer } = render(
    <Slot
      slotId="s2"
      heatmap={heatmap2}
      participantCount={participantCount2}
      currentSelections={currentSelections2}
      onMouseDown={() => {}}
      onMouseEnter={() => {}}
    />,
  );
  // opacity = 1/2 = 0.5
  expect(unselectedContainer.querySelector("button")?.style.background).toBe(
    "rgba(34, 197, 94, 0.5)",
  );
});
