import { beforeEach, describe, expect, it, mock } from "bun:test";

// 1. Mock NDK
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
    NDKPrivateKeySigner: class MockSigner {
      static generate() {
        return new MockSigner();
      }

      nsec = Promise.resolve("mock-nsec");

      user() {
        return Promise.resolve({ pubkey: "mock-pubkey" });
      }
    },
  };
});

// 2. Mock Crypto
mock.module("../src/utils/crypto", () => ({
  deriveBlindedId: async (id: string, _key: string) => `blinded-${id}`,
  deriveResponseId: async (pubkey: string, roomId: string, _key: string) =>
    `response-${pubkey}-${roomId}`,
  encryptData: (text: string, _key: string) => `encrypted-${text}`,
  decryptData: (text: string, _key: string) => text.replace("encrypted-", ""),
  getOrCreateRoomKey: () => "mock-key",
}));

mock.module("../src/signals/store", () => ({
  upsertResponse: mock(),
}));

import { decryptData, deriveBlindedId } from "../src/utils/crypto";
import { upsertResponse } from "../src/signals/store";

// Import local code
import {
  _resetNDK,
  initNDK,
  publishResponse,
  publishRoom,
  subscribeToRoom,
} from "../src/utils/nostr";

const MOCK_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

describe("Nostr Utilities (Crypto Integrated)", () => {
  beforeEach(() => {
    mock.restore();
    window.localStorage.clear();
    _resetNDK();
  });

  it("should initialize NDK", async () => {
    const ndk = await initNDK();
    expect(ndk.connect).toHaveBeenCalled();
  });

  it("should encrypt and blind data when publishing a room", async () => {
    const roomData = {
      roomId: "test-room-123",
      title: "Secret Sync",
      options: ["1800", "3600"],
      roomKey: MOCK_KEY,
    };

    const event = await publishRoom(roomData);

    const blindedId = await deriveBlindedId(roomData.roomId, MOCK_KEY);

    expect(event.kind).toBe(30030);
    expect(event.tags).toContainEqual(["d", blindedId]);

    // Should NOT contain plaintext title/options in tags
    expect(event.tags.some((t) => t[0] === "title")).toBe(false);
    expect(event.tags.some((t) => t[0] === "options")).toBe(false);

    // Content should be encrypted
    const decrypted = decryptData(event.content, MOCK_KEY);
    const parsed = JSON.parse(decrypted);
    expect(parsed.t).toBe("Secret Sync");
    expect(parsed.s).toBe(1800);
    expect(parsed.o).toBe("11");
  });

  it("should encrypt name and slots when publishing a response", async () => {
    const responseData = {
      rootId: "root-event-id",
      name: "Alice",
      slots: new Set(["1800"]),
      roomKey: MOCK_KEY,
      slotStart: 1800,
      slotCount: 2,
    };

    const event = await publishResponse(responseData);

    expect(event.tags).toContainEqual(["e", "root-event-id"]);
    const decrypted = decryptData(event.content, MOCK_KEY);
    const parsed = JSON.parse(decrypted);
    expect(parsed.n).toBe("Alice");
    expect(parsed.o).toBe("10");
  });

  it("ignores responses with mismatched d tags", async () => {
    const ndk = await initNDK();
    const rootEvent = {
      id: "root-1",
      content: `encrypted-${JSON.stringify({ t: "Room", s: 1800, o: "1" })}`,
      tags: [],
    };
    const fetchEventMock = ndk.fetchEvent as unknown as ReturnType<typeof mock>;
    fetchEventMock.mockResolvedValue(rootEvent);
    const subscribeMock = ndk.subscribe as unknown as ReturnType<typeof mock>;
    subscribeMock.mockImplementation(() => {
      const on = mock();
      return { on, stop: mock() };
    });

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    if (!result) throw new Error("Expected room result");

    const subscription = subscribeMock.mock.results[0]?.value;
    const onHandler = subscription?.on;
    const onCall = onHandler?.mock.calls.find((call: unknown[]) => call[0] === "event");
    const emit = onCall?.[1];
    if (!emit) throw new Error("Missing event handler");

    emit({
      id: "response-1",
      pubkey: "attacker-pubkey",
      tags: [["d", "response-victim-root-1"]],
      content: `encrypted-${JSON.stringify({ n: "Eve", o: "1" })}`,
      created_at: 100,
    });

    await Promise.resolve();
    expect(upsertResponse).not.toHaveBeenCalled();
  });
});
