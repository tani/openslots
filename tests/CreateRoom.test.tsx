// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

/// <reference lib="dom" />
import { afterEach, expect, mock, spyOn, test } from "bun:test";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/preact";
import * as preactIso from "preact-iso";
import { CreateRoom } from "../src/pages/CreateRoom";
import * as nostrUtils from "../src/utils/nostr";

afterEach(() => {
  cleanup();
});

// Mock Nostr
const publishRoomSpy = spyOn(nostrUtils, "publishRoom").mockResolvedValue(
  {} as unknown as Awaited<ReturnType<typeof nostrUtils.publishRoom>>,
);

// Mock preact-iso
const mockRoute = mock(() => {});
spyOn(preactIso, "useLocation").mockReturnValue({
  route: mockRoute,
  path: "/",
} as unknown as ReturnType<typeof preactIso.useLocation>);

test("CreateRoom renders form and creates room with key", async () => {
  render(<CreateRoom />);

  const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
  fireEvent.input(titleInput, { target: { value: "New Meeting" } });

  const form = screen.getByText(/Create room/i).closest("form");
  if (!form) throw new Error("Form not found");
  fireEvent.submit(form);

  await waitFor(() => {
    expect(publishRoomSpy).toHaveBeenCalled();
  });

  const callArgs = publishRoomSpy.mock.calls[0][0];
  expect(callArgs.title).toBe("New Meeting");
  expect(callArgs.roomId).toBeDefined();
  expect(callArgs.roomKey).toBeDefined();
  expect(callArgs.roomKey.length).toBe(64); // 32 bytes hex
});

test("CreateRoom updates inputs and handles invalid time", () => {
  render(<CreateRoom />);

  const startTime = screen.getByLabelText(/Start time/i);
  fireEvent.input(startTime, { target: { value: "invalid" } });

  const endTime = screen.getByLabelText(/End time/i);
  fireEvent.input(endTime, { target: { value: "08:00" } });

  const tzSelect = screen.getByLabelText(/Timezone/i) as HTMLSelectElement;
  const optionValue = tzSelect.options[0]?.value;
  if (optionValue) {
    fireEvent.change(tzSelect, { target: { value: optionValue } });
  }

  expect(screen.getByText(/0 slots/i)).toBeTruthy();
});

test("CreateRoom handles no selected dates", () => {
  render(<CreateRoom />);

  fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
  expect(screen.getByText(/0 slots/i)).toBeTruthy();
});

test("CreateRoom toggles dates from the calendar", () => {
  render(<CreateRoom />);

  expect(screen.getByText(/7 selected/i)).toBeTruthy();
  const dateButtons = screen.getAllByRole("button", {
    name: /Toggle date \d{4}-\d{2}-\d{2}/,
  });
  const target = dateButtons.find(
    (button) => button.getAttribute("aria-pressed") === "true",
  );
  if (!target) throw new Error("Expected a selected date");
  fireEvent.click(target);
  expect(screen.getByText(/6 selected/i)).toBeTruthy();
});

test("CreateRoom selects a new date from the calendar", () => {
  render(<CreateRoom />);

  fireEvent.click(screen.getByRole("button", { name: "Clear dates" }));
  const dateButtons = screen.getAllByRole("button", {
    name: /Toggle date \d{4}-\d{2}-\d{2}/,
  });
  const target = dateButtons.find(
    (button) => button.getAttribute("aria-pressed") === "false",
  );
  if (!target) throw new Error("Expected an unselected date");
  fireEvent.click(target);
  expect(screen.getByText(/1 selected/i)).toBeTruthy();
});

test("CreateRoom navigates calendar months", () => {
  render(<CreateRoom />);

  const currentLabel = screen.getByText(/[A-Za-z]+ \d{4}/).textContent;
  const nextButton = screen.getByRole("button", { name: "Next month" });
  fireEvent.click(nextButton);
  const nextLabel = screen.getByText(/[A-Za-z]+ \d{4}/).textContent;
  expect(nextLabel).not.toBe(currentLabel);
  const prevButton = screen.getByRole("button", { name: "Previous month" });
  fireEvent.click(prevButton);
  const restoredLabel = screen.getByText(/[A-Za-z]+ \d{4}/).textContent;
  expect(restoredLabel).toBe(currentLabel);
});

test("CreateRoom removes a selected date from the list", () => {
  render(<CreateRoom />);

  const removeButtons = screen.getAllByRole("button", {
    name: /Remove \d{4}-\d{2}-\d{2}/,
  });
  if (!removeButtons[0]) throw new Error("Expected a removable date");
  fireEvent.click(removeButtons[0]);
  expect(screen.getByText(/6 selected/i)).toBeTruthy();
});
