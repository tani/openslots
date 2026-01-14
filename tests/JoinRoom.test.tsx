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
import type { Event as NostrEvent } from "nostr-tools";
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

const createRoot = (id: string): NostrEvent => ({
  id,
  kind: 30078,
  content: "",
  created_at: 0,
  pubkey: "mock-pubkey",
  sig: "mock-sig",
  tags: [],
});

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
    root: createRoot("root-1"),
    sub: { stop: stopMock },
    room: {
      title: "Test Room",
      slots: ["1736773200", "1736776800", "1736859600"],
      slotStart: 1736773200,
      slotMask: "111",
    },
  });

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
    root: createRoot("root-1"),
    sub: { stop: mock(() => {}) },
    room: {
      title: "Team Sync",
      slots: ["1736773200", "1736776800", "1736859600"],
      slotStart: 1736773200,
      slotMask: "111",
    },
  });

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

test("JoinRoom shares via Web Share API and clears status", async () => {
  subscribeSpy.mockResolvedValueOnce({
    root: createRoot("root-1"),
    sub: { stop: mock(() => {}) },
    room: {
      title: "Team Sync",
      slots: ["1736773200"],
      slotStart: 1736773200,
      slotMask: "1",
    },
  });

  const shareMock = mock(() => Promise.resolve());
  const originalShare = navigator.share;
  Object.defineProperty(navigator, "share", {
    value: shareMock,
    configurable: true,
  });

  const originalSetTimeout = globalThis.setTimeout;
  let capturedCallback: Parameters<typeof setTimeout>[0] | null = null;
  const setTimeoutCalls = mock((..._args: Parameters<typeof setTimeout>) => {});
  const setTimeoutMock: typeof setTimeout = Object.assign(
    ((...args: Parameters<typeof setTimeout>) => {
      setTimeoutCalls(...args);
      [capturedCallback] = args;
      return originalSetTimeout(() => {}, 0);
    }) as typeof setTimeout,
    {
      __promisify__: originalSetTimeout.__promisify__,
    },
  );

  try {
    render(<JoinRoom id="room-123" />);

    expect(await screen.findByText("Team Sync")).toBeTruthy();
    globalThis.setTimeout = setTimeoutMock;

    const shareButton = screen.getByText("Share room");
    await fireEvent.click(shareButton);
    await Promise.resolve();

    expect(shareMock).toHaveBeenCalled();
    expect(screen.getByText("Shared")).toBeTruthy();

    expect(setTimeoutCalls).toHaveBeenCalledTimes(1);
    expect(typeof capturedCallback).toBe("function");
    if (typeof capturedCallback === "function") {
      (capturedCallback as () => void)();
    }
  } finally {
    Object.defineProperty(navigator, "share", {
      value: originalShare,
      configurable: true,
    });
    globalThis.setTimeout = originalSetTimeout;
  }
});

test("JoinRoom falls back to clipboard sharing", async () => {
  subscribeSpy.mockResolvedValueOnce({
    root: createRoot("root-1"),
    sub: { stop: mock(() => {}) },
    room: {
      title: "Team Sync",
      slots: ["1736773200"],
      slotStart: 1736773200,
      slotMask: "1",
    },
  });

  const writeTextMock = mock(() => Promise.resolve());
  const originalShare = navigator.share;
  const originalClipboard = navigator.clipboard;
  Object.defineProperty(navigator, "share", {
    value: undefined,
    configurable: true,
  });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  });

  try {
    render(<JoinRoom id="room-123" />);
    expect(await screen.findByText("Team Sync")).toBeTruthy();
    const shareButton = await screen.findByText("Share room");
    await fireEvent.click(shareButton);

    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByText("Link copied")).toBeTruthy();
  } finally {
    Object.defineProperty(navigator, "share", {
      value: originalShare,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
  }
});

test("JoinRoom reports share failure when clipboard write fails", async () => {
  subscribeSpy.mockResolvedValueOnce({
    root: createRoot("root-1"),
    sub: { stop: mock(() => {}) },
    room: {
      title: "Team Sync",
      slots: ["1736773200"],
      slotStart: 1736773200,
      slotMask: "1",
    },
  });

  const shareMock = mock(() => Promise.reject(new Error("blocked")));
  const writeTextMock = mock(() => Promise.reject(new Error("no-clipboard")));
  const originalShare = navigator.share;
  const originalClipboard = navigator.clipboard;
  Object.defineProperty(navigator, "share", {
    value: shareMock,
    configurable: true,
  });
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    configurable: true,
  });

  try {
    render(<JoinRoom id="room-123" />);
    expect(await screen.findByText("Team Sync")).toBeTruthy();
    const shareButton = screen.getByText("Share room");
    await fireEvent.click(shareButton);

    expect(shareMock).toHaveBeenCalled();
    expect(writeTextMock).toHaveBeenCalled();
    expect(await screen.findByText("Unable to share")).toBeTruthy();
  } finally {
    Object.defineProperty(navigator, "share", {
      value: originalShare,
      configurable: true,
    });
    Object.defineProperty(navigator, "clipboard", {
      value: originalClipboard,
      configurable: true,
    });
  }
});
