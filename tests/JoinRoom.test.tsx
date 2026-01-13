/// <reference lib="dom" />
import { expect, mock, spyOn, test } from "bun:test";
import { render, screen } from "@testing-library/preact";
import { JoinRoom } from "../src/pages/JoinRoom";
import * as nostrUtils from "../src/utils/nostr";

// Spy on Nostr utils
spyOn(nostrUtils, "subscribeToRoom").mockResolvedValue({
  root: {
    id: "root-1",
    tags: [
      ["title", "Test Room"],
      ["options", "123456"],
    ],
  } as unknown as Parameters<typeof nostrUtils.publishResponse>[0], // Using a compatible shape
  sub: { stop: mock(() => {}) },
} as unknown as Awaited<ReturnType<typeof nostrUtils.subscribeToRoom>>);

spyOn(nostrUtils, "publishResponse").mockResolvedValue(
  {} as unknown as Awaited<ReturnType<typeof nostrUtils.publishResponse>>,
);

test("JoinRoom shows loading state then content", async () => {
  render(<JoinRoom id="room-123" />);

  expect(screen.getByText(/Syncing with relays/i)).toBeTruthy();

  // Wait for the room to load
  const title = await screen.findByText("Test Room");
  expect(title).toBeTruthy();
  expect(screen.getByText(/Your response/i)).toBeTruthy();
});

test("JoinRoom shows missing state if no id", () => {
  render(<JoinRoom id="" />);
  expect(screen.getByText(/Room not found/i)).toBeTruthy();
});
