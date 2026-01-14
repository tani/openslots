/// <reference lib="dom" />
import { afterEach, expect, mock, spyOn, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/preact";
import { JoinRoom } from "../src/pages/JoinRoom";
import * as nostrUtils from "../src/utils/nostr";

// Mock crypto
mock.module("../src/utils/crypto", () => ({
  getOrCreateRoomKey: () => "mock-key",
  deriveBlindedId: async (id: string) => `blinded-${id}`,
  decryptData: (text: string) => text,
  encryptData: (text: string) => text,
}));

afterEach(() => {
  cleanup();
});

// Spy on Nostr utils
type SubscribeReturn = Awaited<ReturnType<typeof nostrUtils.subscribeToRoom>>;

spyOn(nostrUtils, "subscribeToRoom").mockResolvedValue({
  root: {
    id: "root-1",
    tags: [],
  },
  sub: { stop: mock(() => {}) },
  room: {
    title: "Test Room",
    slots: ["1736773200"],
    slotStart: 1736773200,
    slotMask: "1",
  },
} as unknown as SubscribeReturn);

spyOn(nostrUtils, "publishResponse").mockResolvedValue(
  {} as unknown as Awaited<ReturnType<typeof nostrUtils.publishResponse>>,
);
spyOn(nostrUtils, "getMyPubkey").mockResolvedValue("my-pubkey");

test("JoinRoom shows loading state then content", async () => {
  render(<JoinRoom id="room-123" />);

  expect(screen.getByText(/Synchronizing with Nostr relays/i)).toBeTruthy();

  // Wait for the room to load
  const title = await screen.findByText("Test Room");
  expect(title).toBeTruthy();
  expect(screen.getByText(/Your response/i)).toBeTruthy();
});

test("JoinRoom shows missing state if no id", () => {
  render(<JoinRoom id="" />);
  expect(screen.getByText(/Room not found/i)).toBeTruthy();
});
