// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

/// <reference lib="dom" />
import {
  afterAll,
  afterEach,
  beforeEach,
  expect,
  mock,
  spyOn,
  test,
} from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { JoinRoom } from "../src/pages/JoinRoom";
import {
  currentSelections,
  currentUserPubkey,
  responses,
  upsertResponse,
} from "../src/signals/store";
import * as cryptoUtils from "../src/utils/crypto";
import * as nostrUtils from "../src/utils/nostr";

afterEach(() => {
  cleanup();
});

afterAll(() => {
  mock.restore();
});

type SubscribeReturn = Awaited<ReturnType<typeof nostrUtils.subscribeToRoom>>;

const subscribeSpy = spyOn(nostrUtils, "subscribeToRoom");
const publishSpy = spyOn(nostrUtils, "publishResponse");
spyOn(nostrUtils, "getMyPubkey").mockResolvedValue("my-pubkey");
const roomKeySpy = spyOn(cryptoUtils, "getOrCreateRoomKey");
const blindedIdSpy = spyOn(cryptoUtils, "deriveBlindedId");

beforeEach(() => {
  subscribeSpy.mockReset();
  publishSpy.mockReset();
  responses.value = new Map();
  currentSelections.value = new Set();
  currentUserPubkey.value = null;
  roomKeySpy.mockReturnValue("mock-key");
  blindedIdSpy.mockImplementation(async (id: string) => `blinded-${id}`);
  publishSpy.mockResolvedValue({} as never);
});

test("JoinRoom shows loading state then content", async () => {
  const stopMock = mock(() => {});
  subscribeSpy.mockResolvedValueOnce({
    root: {
      id: "root-1",
      tags: [],
    },
    sub: { stop: stopMock },
    room: {
      title: "Test Room",
      slots: ["1736773200", "1736776800", "1736859600"],
      slotStart: 1736773200,
      slotMask: "111",
    },
  } as unknown as SubscribeReturn);

  const { unmount } = render(<JoinRoom id="room-123" />);

  expect(screen.getByText(/Synchronizing with Nostr relays/i)).toBeTruthy();

  // Wait for the room to load
  const title = await screen.findByText("Test Room");
  expect(title).toBeTruthy();
  expect(screen.getByText(/Your response/i)).toBeTruthy();

  await Promise.resolve();
  expect(currentUserPubkey.value).toBe("my-pubkey");

  unmount();
  expect(stopMock).toHaveBeenCalled();
});

test("JoinRoom shows missing state if room not found", async () => {
  subscribeSpy.mockResolvedValueOnce(null);
  render(<JoinRoom id="room-123" />);
  const missing = await screen.findByText(/Room not found/i);
  expect(missing).toBeTruthy();
});

test("JoinRoom shows missing state if no id", () => {
  render(<JoinRoom id="" />);
  expect(screen.getByText(/Room not found/i)).toBeTruthy();
});

test("JoinRoom renders participants and publishes response", async () => {
  subscribeSpy.mockResolvedValueOnce({
    root: {
      id: "root-1",
      tags: [],
    },
    sub: { stop: mock(() => {}) },
    room: {
      title: "Team Sync",
      slots: ["1736773200", "1736776800", "1736859600"],
      slotStart: 1736773200,
      slotMask: "111",
    },
  } as unknown as SubscribeReturn);

  render(<JoinRoom id="room-123" />);

  expect(await screen.findByText("Team Sync")).toBeTruthy();

  upsertResponse("pubkey-1", {
    name: "Bob",
    slots: new Set(["1736773200"]),
    timestamp: 1,
  });
  currentSelections.value = new Set(["1736773200"]);

  expect(await screen.findByText("Bob")).toBeTruthy();
  expect(screen.getByText("1")).toBeTruthy();

  const nameInput = screen.getByLabelText(/Name/i);
  await fireEvent.input(nameInput, { target: { value: "Alice" } });

  const publishButton = await screen.findByText(/Publish availability/i);
  await fireEvent.click(publishButton);

  expect(publishSpy).toHaveBeenCalledWith({
    rootId: "root-1",
    name: "Alice",
    slots: new Set(["1736773200"]),
    roomKey: "mock-key",
    slotStart: 1736773200,
    slotCount: 3,
  });
});
