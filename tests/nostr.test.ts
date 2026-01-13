import { beforeEach, describe, expect, it, mock } from "bun:test";

// 1. Mock NDK before importing our utility
mock.module("@nostr-dev-kit/ndk", () => {
  const mockPublish = mock(() => Promise.resolve());

  return {
    default: class MockNDK {
      signer = undefined;
      connect = mock(() => Promise.resolve());
      fetchEvent = mock(() => Promise.resolve(null));
      subscribe = mock(() => ({
        on: mock(),
        stop: mock(),
      }));
    },
    NDKEvent: class MockNDKEvent {
      kind = 0;
      tags = [];
      content = "";
      publish = mockPublish;
    },
    NDKPrivateKeySigner: {
      generate: () => ({
        nsec: Promise.resolve("mock-nsec"),
      }),
    },
  };
});

// Import the real code (it will now use the mocks above)
import {
  _resetNDK,
  initNDK,
  publishResponse,
  publishRoom,
} from "../src/utils/nostr";

describe("Nostr Utilities (Mocked with Bun)", () => {
  beforeEach(() => {
    mock.restore(); // Use Bun's native restore
    window.localStorage.clear();
    _resetNDK();
  });

  it("should initialize NDK and save a private key if none exists", async () => {
    const ndk = await initNDK();

    expect(ndk.connect).toHaveBeenCalled();
    expect(window.localStorage.getItem("when2nostr_private_key")).toBe(
      "mock-nsec",
    );
  });

  it("should format tags correctly when publishing a room", async () => {
    const roomData = {
      roomId: "test-room-123",
      title: "Antigravity Sync",
      options: ["1736770000", "1736770900"],
    };

    const event = await publishRoom(roomData);

    expect(event.kind).toBe(10001);
    expect(event.tags).toContainEqual(["d", "test-room-123"]);
    expect(event.tags).toContainEqual(["title", "Antigravity Sync"]);
    expect(event.tags).toContainEqual(["options", "1736770000,1736770900"]);
    expect(event.publish).toHaveBeenCalled();
  });

  it("should format tags correctly when publishing a response", async () => {
    const responseData = {
      rootId: "event-abc",
      name: "Alice",
      slots: ["1736770000"],
    };

    const event = await publishResponse(responseData);

    expect(event.tags).toContainEqual(["e", "event-abc"]);
    expect(event.tags).toContainEqual(["name", "Alice"]);
    expect(event.tags).toContainEqual(["r", "1736770000"]);
    expect(event.publish).toHaveBeenCalled();
  });

  it("should handle incoming room events and update signals", async () => {
    const { responses } = await import("../src/signals/store");
    const { subscribeToRoom, initNDK } = await import("../src/utils/nostr");

    // Clear signal for test
    responses.value = new Map();

    // Prepare NDK mock to return a root event
    const ndk = await initNDK();
    (
      ndk.fetchEvent as unknown as {
        mockResolvedValueOnce: (v: unknown) => void;
      }
    ).mockResolvedValueOnce({ id: "root-abc", tags: [] });

    const result = await subscribeToRoom("room-123");
    expect(result).not.toBeNull();

    // Access the 'on' handler that was registered
    const onHandler = (
      result?.sub.on as unknown as {
        mock: { calls: [string, (event: unknown) => void][] };
      }
    ).mock.calls.find((call) => call[0] === "event")?.[1];

    expect(onHandler).toBeDefined();

    // Simulate an incoming Nostr event
    const mockEvent = {
      pubkey: "alice-pubkey",
      created_at: 1000,
      tags: [
        ["name", "Alice"],
        ["r", "slot-1,slot-2"],
      ],
    };

    onHandler?.(mockEvent);

    const aliceResponse = responses.value.get("alice-pubkey");
    expect(aliceResponse).toBeDefined();
    expect(aliceResponse?.name).toBe("Alice");
    expect(aliceResponse?.slots.has("slot-1")).toBe(true);
  });
});
