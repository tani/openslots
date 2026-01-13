/// <reference lib="dom" />
import { expect, mock, test } from "bun:test";
import { fireEvent, render } from "@testing-library/preact";
import { Slot } from "../src/components/Slot";

test("Slot handles mouse events", () => {
  const onMouseDown = mock((_id: string) => {});
  const onMouseEnter = mock((_id: string) => {});

  const { container } = render(
    <Slot
      slotId="slot-1"
      count={1}
      total={2}
      selected={false}
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
  const { container: selectedContainer } = render(
    <Slot
      slotId="s1"
      count={0}
      total={1}
      selected={true}
      onMouseDown={() => {}}
      onMouseEnter={() => {}}
    />,
  );
  expect(selectedContainer.querySelector("button")?.style.background).toBe(
    "rgba(34, 197, 94, 0.8)",
  );

  const { container: unselectedContainer } = render(
    <Slot
      slotId="s2"
      count={1}
      total={2}
      selected={false}
      onMouseDown={() => {}}
      onMouseEnter={() => {}}
    />,
  );
  // opacity = 1/2 = 0.5
  expect(unselectedContainer.querySelector("button")?.style.background).toBe(
    "rgba(34, 197, 94, 0.5)",
  );
});
