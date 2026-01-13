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
    NDKPrivateKeySigner: {
      generate: () => ({
        nsec: Promise.resolve("mock-nsec"),
      }),
    },
  };
});

// 2. Mock Crypto
mock.module("../src/utils/crypto", () => ({
  deriveBlindedId: async (id: string, _key: string) => `blinded-${id}`,
  encryptData: (text: string, _key: string) => `encrypted-${text}`,
  decryptData: (text: string, _key: string) => text.replace("encrypted-", ""),
  getOrCreateRoomKey: () => "mock-key",
}));

import { decryptData, deriveBlindedId } from "../src/utils/crypto";

// Import local code
import {
  _resetNDK,
  initNDK,
  publishResponse,
  publishRoom,
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
      options: ["1000", "2000"],
      roomKey: MOCK_KEY,
    };

    const event = await publishRoom(roomData);

    const blindedId = await deriveBlindedId(roomData.roomId, MOCK_KEY);

    expect(event.kind).toBe(10001);
    expect(event.tags).toContainEqual(["d", blindedId]);

    // Should NOT contain plaintext title/options in tags
    expect(event.tags.some((t) => t[0] === "title")).toBe(false);
    expect(event.tags.some((t) => t[0] === "options")).toBe(false);

    // Content should be encrypted
    const decrypted = decryptData(event.content, MOCK_KEY);
    const parsed = JSON.parse(decrypted);
    expect(parsed.title).toBe("Secret Sync");
    expect(parsed.options).toEqual(["1000", "2000"]);
  });

  it("should encrypt name and blind slots when publishing a response", async () => {
    const responseData = {
      rootId: "root-event-id",
      name: "Alice",
      slots: ["1000"],
      roomKey: MOCK_KEY,
    };

    const event = await publishResponse(responseData);

    expect(event.tags).toContainEqual(["e", "root-event-id"]);

    // Name should be encrypted
    const nameTag = event.tags.find((t) => t[0] === "name");
    expect(nameTag).toBeDefined();
    const nameValue = nameTag?.[1];
    expect(nameValue).toBe("encrypted-Alice");
    if (!nameValue) throw new Error("Missing name tag value");
    expect(decryptData(nameValue, MOCK_KEY)).toBe("Alice");

    // Slots should be blinded in 'r' tags
    const blindedSlot = await deriveBlindedId("1000", MOCK_KEY);
    expect(event.tags).toContainEqual(["r", blindedSlot]);
  });
});
