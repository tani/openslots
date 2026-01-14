// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

/// <reference lib="dom" />
import { afterEach, expect, mock, test } from "bun:test";
import { signal } from "@preact/signals";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";

const currentSelections = signal(new Set<string>());
const heatmap = signal(new Map<string, number>());
const participantCount = signal(0);
const updateSelection = mock((slot: string, shouldAdd: boolean) => {
  const next = new Set(currentSelections.value);
  if (shouldAdd) {
    next.add(slot);
  } else {
    next.delete(slot);
  }
  currentSelections.value = next;
});

mock.module("../src/signals/store", () => ({
  currentSelections,
  heatmap,
  participantCount,
  updateSelection,
}));

import { Grid } from "../src/components/Grid";

afterEach(() => {
  cleanup();
});

test("Grid renders dates and times", () => {
  const dates = ["2026-01-13", "2026-01-14"];
  const times = ["09:00", "10:00"];
  const slotByLocalKey = new Map([
    ["2026-01-13|09:00", "slot-1"],
    ["2026-01-14|10:00", "slot-2"],
  ]);

  render(
    <Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />,
  );

  expect(screen.getByText("2026-01-13")).toBeTruthy();
  expect(screen.getByText("2026-01-14")).toBeTruthy();
  expect(screen.getByText("09:00")).toBeTruthy();
  expect(screen.getByText("10:00")).toBeTruthy();
});

test("Grid drag selection updates slots", () => {
  currentSelections.value = new Set();
  updateSelection.mockClear();

  const dates = ["2026-01-13", "2026-01-14"];
  const times = ["09:00"];
  const slotByLocalKey = new Map([
    ["2026-01-13|09:00", "slot-1"],
    ["2026-01-14|09:00", "slot-2"],
  ]);

  render(<Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />);

  const buttons = screen.getAllByRole("button");
  fireEvent.mouseDown(buttons[0]);
  fireEvent.mouseEnter(buttons[1]);
  fireEvent.mouseUp(window);

  expect(updateSelection).toHaveBeenCalledWith("slot-1", true);
  expect(updateSelection).toHaveBeenCalledWith("slot-2", true);
  expect(updateSelection).toHaveBeenCalledTimes(2);
});

test("Grid ignores hover when not dragging", () => {
  currentSelections.value = new Set();
  updateSelection.mockClear();

  const dates = ["2026-01-13"];
  const times = ["09:00"];
  const slotByLocalKey = new Map([["2026-01-13|09:00", "slot-1"]]);

  render(<Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />);

  const button = screen.getByRole("button");
  fireEvent.mouseEnter(button);
  expect(updateSelection).not.toHaveBeenCalled();
});

test("Grid cleans up mouseup handler on unmount", () => {
  const original = window.removeEventListener;
  const removeSpy = mock(window.removeEventListener);
  window.removeEventListener = removeSpy as typeof window.removeEventListener;

  const dates = ["2026-01-13"];
  const times = ["09:00"];
  const slotByLocalKey = new Map([["2026-01-13|09:00", "slot-1"]]);

  const { unmount } = render(
    <Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />,
  );

  unmount();
  window.removeEventListener = original;
  expect(removeSpy).toHaveBeenCalledWith("mouseup", expect.any(Function));
});

test("Grid stops dragging on mouseup handler", () => {
  currentSelections.value = new Set();
  updateSelection.mockClear();

  const originalAdd = window.addEventListener;
  const addSpy = mock(window.addEventListener);
  window.addEventListener = addSpy as typeof window.addEventListener;

  const dates = ["2026-01-13"];
  const times = ["09:00"];
  const slotByLocalKey = new Map([["2026-01-13|09:00", "slot-1"]]);

  const { unmount } = render(
    <Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />,
  );

  const button = screen.getByRole("button");
  fireEvent.mouseDown(button);

  const handler = addSpy.mock.calls.find(
    (call: unknown[]) => call[0] === "mouseup",
  )?.[1] as EventListener | undefined;
  handler?.(new MouseEvent("mouseup"));

  fireEvent.mouseEnter(button);
  window.addEventListener = originalAdd;
  unmount();

  expect(updateSelection).toHaveBeenCalledTimes(1);
});
