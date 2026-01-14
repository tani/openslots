// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

/// <reference lib="dom" />
import { afterEach, expect, mock, test } from "bun:test";
import { signal } from "@preact/signals";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { SelectedDatesList } from "../src/components/SelectedDatesList";

afterEach(() => {
  cleanup();
});

test("SelectedDatesList shows empty message", () => {
  const normalizedDates = signal<string[]>([]);
  const selectedDateCount = signal(0);
  render(
    <SelectedDatesList
      normalizedDates={normalizedDates}
      selectedDateCount={selectedDateCount}
      onToggleDate={() => {}}
    />,
  );

  expect(screen.getByText("Pick dates to continue.")).toBeTruthy();
  expect(screen.getByText("0 selected")).toBeTruthy();
});

test("SelectedDatesList renders date buttons and toggles", () => {
  const normalizedDates = signal<string[]>(["2026-05-01", "2026-05-02"]);
  const selectedDateCount = signal(2);
  const toggleDate = mock(() => {});

  render(
    <SelectedDatesList
      normalizedDates={normalizedDates}
      selectedDateCount={selectedDateCount}
      onToggleDate={toggleDate}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: "Remove 2026-05-01" }));
  expect(toggleDate).toHaveBeenCalledWith("2026-05-01");
});
