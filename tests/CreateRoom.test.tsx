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

  const startDate = screen.getByLabelText(/Start date/i);
  fireEvent.input(startDate, { target: { value: "2024-02-01" } });

  const days = screen.getByLabelText(/Days/i);
  fireEvent.input(days, { target: { value: "2" } });

  const startTime = screen.getByLabelText(/Start time/i);
  fireEvent.input(startTime, { target: { value: "invalid" } });

  const endTime = screen.getByLabelText(/End time/i);
  fireEvent.input(endTime, { target: { value: "08:00" } });

  const tzSelect = screen.getByLabelText(/Timezone/i) as HTMLSelectElement;
  const optionValue = tzSelect.options[0]?.value;
  if (optionValue) {
    fireEvent.change(tzSelect, { target: { value: optionValue } });
  }

  expect(screen.getByText(/0 time slots/i)).toBeTruthy();
});
