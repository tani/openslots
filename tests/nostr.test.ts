// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import {
  afterAll,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  spyOn,
} from "bun:test";

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

import * as store from "../src/signals/store";
import * as cryptoUtils from "../src/utils/crypto";

// Import local code
import {
  _resetNDK,
  getMyPubkey,
  getRelays,
  initNDK,
  publishResponse,
  publishRoom,
  setRelays,
  subscribeToRoom,
} from "../src/utils/nostr";

const MOCK_KEY =
  "0000000000000000000000000000000000000000000000000000000000000001";

describe("Nostr Utilities (Crypto Integrated)", () => {
  beforeEach(() => {
    mock.restore();
    window.localStorage.clear();
    _resetNDK();
    spyOn(store, "upsertResponse").mockImplementation(() => {});
    spyOn(cryptoUtils, "deriveBlindedId").mockImplementation(
      async (id: string, _key: string) => `blinded-${id}`,
    );
    spyOn(cryptoUtils, "deriveResponseId").mockImplementation(
      async (pubkey: string, roomId: string, _key: string) =>
        `response-${pubkey}-${roomId}`,
    );
    spyOn(cryptoUtils, "encryptData").mockImplementation(
      async (text: string, _key: string) => `encrypted-${text}`,
    );
    spyOn(cryptoUtils, "decryptData").mockImplementation(
      async (text: string, _key: string) => text.replace("encrypted-", ""),
    );
    spyOn(cryptoUtils, "getOrCreateRoomKey").mockReturnValue("mock-key");
  });

  afterAll(() => {
    mock.restore();
  });

  it("should initialize NDK", async () => {
    const ndk = await initNDK();
    expect(ndk.connect).toHaveBeenCalled();
  });

  it("reuses the cached NDK instance", async () => {
    const ndk1 = await initNDK();
    const ndk2 = await initNDK();
    expect(ndk1).toBe(ndk2);
    expect(ndk1.connect).toHaveBeenCalledTimes(1);
  });

  it("returns defaults when relays storage is invalid", () => {
    window.localStorage.setItem("openslots_relays", "not-json");
    expect(getRelays()).toEqual([
      "wss://nos.lol",
      "wss://relay.damus.io",
      "wss://nostr.wine",
    ]);
  });

  it("stores relays in localStorage", () => {
    setRelays(["wss://example.com"]);
    expect(window.localStorage.getItem("openslots_relays")).toBe(
      JSON.stringify(["wss://example.com"]),
    );
    expect(getRelays()).toEqual(["wss://example.com"]);
  });

  it("generates signer when localStorage is missing", async () => {
    const original = window.localStorage;
    Object.defineProperty(window, "localStorage", {
      value: undefined,
      configurable: true,
    });
    try {
      expect(getRelays()).toEqual([
        "wss://nos.lol",
        "wss://relay.damus.io",
        "wss://nostr.wine",
      ]);
      const pubkey = await getMyPubkey();
      expect(pubkey).toBe("mock-pubkey");
    } finally {
      Object.defineProperty(window, "localStorage", {
        value: original,
        configurable: true,
      });
    }
  });

  it("uses stored private key when available", async () => {
    window.localStorage.setItem("openslots_private_key", "nsec-test");
    const pubkey = await getMyPubkey();
    expect(pubkey).toBe("mock-pubkey");
  });

  it("should encrypt and blind data when publishing a room", async () => {
    const roomData = {
      roomId: "test-room-123",
      title: "Secret Sync",
      options: ["1800", "3600"],
      roomKey: MOCK_KEY,
    };

    const event = await publishRoom(roomData);

    const blindedId = await cryptoUtils.deriveBlindedId(
      roomData.roomId,
      MOCK_KEY,
    );

    expect(event.kind).toBe(30078);
    expect(event.tags).toContainEqual(["d", blindedId]);

    // Should NOT contain plaintext title/options in tags
    expect(event.tags.some((t) => t[0] === "title")).toBe(false);
    expect(event.tags.some((t) => t[0] === "options")).toBe(false);

    // Content should be encrypted
    const decrypted = await cryptoUtils.decryptData(event.content, MOCK_KEY);
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
    const decrypted = await cryptoUtils.decryptData(event.content, MOCK_KEY);
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
    const onCall = onHandler?.mock.calls.find(
      (call: unknown[]) => call[0] === "event",
    );
    const emit = onCall?.[1];
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-1",
      pubkey: "attacker-pubkey",
      tags: [["d", "response-victim-root-1"]],
      content: `encrypted-${JSON.stringify({ n: "Eve", o: "1" })}`,
      created_at: 100,
    });

    await Promise.resolve();
    expect(store.upsertResponse).not.toHaveBeenCalled();
  });

  it("ignores responses without d tags", async () => {
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
    const onCall = onHandler?.mock.calls.find(
      (call: unknown[]) => call[0] === "event",
    );
    const emit = onCall?.[1];
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-2",
      pubkey: "attacker-pubkey",
      tags: [],
      content: `encrypted-${JSON.stringify({ n: "Eve", o: "1" })}`,
      created_at: 101,
    });

    await Promise.resolve();
    expect(store.upsertResponse).not.toHaveBeenCalled();
  });

  it("returns null when room payload cannot be decrypted", async () => {
    const ndk = await initNDK();
    const rootEvent = {
      id: "root-1",
      content: "encrypted-{bad",
      tags: [],
    };
    const fetchEventMock = ndk.fetchEvent as unknown as ReturnType<typeof mock>;
    fetchEventMock.mockResolvedValue(rootEvent);

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    expect(result).toBeNull();
  });

  it("returns null when no room event exists", async () => {
    const ndk = await initNDK();
    const fetchEventMock = ndk.fetchEvent as unknown as ReturnType<typeof mock>;
    fetchEventMock.mockResolvedValue(null);

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    expect(result).toBeNull();
  });

  it("updates responses when d tag matches signer", async () => {
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
    const onCall = onHandler?.mock.calls.find(
      (call: unknown[]) => call[0] === "event",
    );
    const emit = onCall?.[1];
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-1",
      pubkey: "user-1",
      tags: [["d", "response-user-1-root-1"]],
      content: `encrypted-${JSON.stringify({ n: "Alice", o: "1" })}`,
      created_at: 100,
    });

    await Promise.resolve();
    expect(store.upsertResponse).toHaveBeenCalledWith("user-1", {
      slots: new Set(["1800"]),
      name: "Alice",
      timestamp: 100,
    });
  });

  it("records decryption errors for responses", async () => {
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
    const onCall = onHandler?.mock.calls.find(
      (call: unknown[]) => call[0] === "event",
    );
    const emit = onCall?.[1];
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-3",
      pubkey: "user-2",
      tags: [["d", "response-user-2-root-1"]],
      content: "encrypted-{bad",
      created_at: 200,
    });

    await Promise.resolve();
    expect(store.upsertResponse).toHaveBeenCalledWith("user-2", {
      slots: new Set(),
      name: "Decryption Error",
      timestamp: 200,
    });
  });
});
