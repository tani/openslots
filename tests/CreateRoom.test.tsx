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
