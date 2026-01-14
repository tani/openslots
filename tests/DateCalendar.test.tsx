// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

/// <reference lib="dom" />
import { afterEach, expect, mock, test } from "bun:test";
import { signal } from "@preact/signals";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { DateCalendar } from "../src/components/DateCalendar";

afterEach(() => {
  cleanup();
});

test("DateCalendar renders labels and handles navigation", () => {
  const monthLabel = signal("March 2026");
  const calendarDays = signal({
    leadingEmpty: 1,
    days: ["2026-03-01", "2026-03-02"],
  });
  const selectedDateSet = signal(new Set<string>(["2026-03-01"]));
  const selectedDateCount = signal(1);
  const prevMonth = mock(() => {});
  const nextMonth = mock(() => {});
  const toggleDate = mock(() => {});
  const clearDates = mock(() => {});

  render(
    <DateCalendar
      monthLabel={monthLabel}
      calendarDays={calendarDays}
      selectedDateSet={selectedDateSet}
      selectedDateCount={selectedDateCount}
      onPrevMonth={prevMonth}
      onNextMonth={nextMonth}
      onToggleDate={toggleDate}
      onClearDates={clearDates}
    />,
  );

  expect(screen.getByText("March 2026")).toBeTruthy();
  expect(screen.getByText("Mon")).toBeTruthy();
  expect(screen.getByText("Sun")).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
  expect(prevMonth).toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Next month" }));
  expect(nextMonth).toHaveBeenCalled();

  fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
  expect(clearDates).toHaveBeenCalled();
});

test("DateCalendar toggles dates and shows empty state", () => {
  const monthLabel = signal("April 2026");
  const calendarDays = signal({
    leadingEmpty: 0,
    days: ["2026-04-01"],
  });
  const selectedDateSet = signal(new Set<string>());
  const selectedDateCount = signal(0);
  const toggleDate = mock(() => {});

  render(
    <DateCalendar
      monthLabel={monthLabel}
      calendarDays={calendarDays}
      selectedDateSet={selectedDateSet}
      selectedDateCount={selectedDateCount}
      onPrevMonth={() => {}}
      onNextMonth={() => {}}
      onToggleDate={toggleDate}
      onClearDates={() => {}}
    />,
  );

  expect(screen.getByText("No dates selected.")).toBeTruthy();
  fireEvent.click(
    screen.getByRole("button", { name: "Toggle date 2026-04-01" }),
  );
  expect(toggleDate).toHaveBeenCalledWith("2026-04-01");
});
