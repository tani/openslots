// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { afterEach, expect, test, vi } from "bun:test";
import { signal } from "@preact/signals";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { Slot } from "../src/components/Slot";

const heatmap = signal(new Map());
const participantCount = signal(0);
const currentSelections = signal(new Set<string>());

afterEach(() => {
  cleanup();
});

test("Slot handles mouse events", () => {
  const onMouseDown = vi.fn();
  const onMouseEnter = vi.fn();

  render(
    <Slot
      slotId="slot-1"
      heatmap={heatmap}
      participantCount={participantCount}
      currentSelections={currentSelections}
      onMouseDown={onMouseDown}
      onMouseEnter={onMouseEnter}
    />,
  );

  const btn = screen.getByRole("button");
  fireEvent.mouseDown(btn);
  expect(onMouseDown).toHaveBeenCalledWith("slot-1");

  fireEvent.mouseEnter(btn);
  expect(onMouseEnter).toHaveBeenCalledWith("slot-1");
});

test("Slot background changes based on selection", () => {
  currentSelections.value.add("slot-1");

  render(
    <Slot
      slotId="slot-1"
      heatmap={heatmap}
      participantCount={participantCount}
      currentSelections={currentSelections}
      onMouseDown={() => {}}
      onMouseEnter={() => {}}
    />,
  );

  const btn = screen.getByRole("button") as HTMLElement;
  expect(btn.style.background).toContain("rgba(34, 197, 94, 0.8)");
});
