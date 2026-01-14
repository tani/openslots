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

// 1. Mock nostr-tools
mock.module("nostr-tools", () => {
  class MockSimplePool {
    get = mock(() => Promise.resolve(null));
    publish = mock(() => Promise.resolve());
    subscribe = mock(() => ({
      close: mock(),
    }));
    close = mock(() => {});
  }

  return {
    SimplePool: MockSimplePool,
    generateSecretKey: () => new Uint8Array(32),
    getPublicKey: () => "mock-pubkey",
    finalizeEvent: (event: {
      kind: number;
      created_at: number;
      tags: string[][];
      content: string;
    }) => ({
      ...event,
      pubkey: "mock-pubkey",
      id: "mock-id",
      sig: "mock-sig",
    }),
    nip19: {
      nsecEncode: () => "nsec-test",
      decode: () => ({ type: "nsec", data: new Uint8Array(32) }),
    },
  };
});

import type { Event as NostrEvent } from "nostr-tools";
import * as nostrTools from "nostr-tools";
import * as store from "../src/signals/store";
import * as cryptoUtils from "../src/utils/crypto";
// Import local code
import {
  _resetPool,
  getMyPubkey,
  getRelays,
  initPool,
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
    _resetPool();
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

  it("should initialize relay pool", async () => {
    const pool = await initPool();
    expect(pool).toBeTruthy();
  });

  it("reuses the cached pool instance", async () => {
    const pool1 = await initPool();
    const pool2 = await initPool();
    expect(pool1).toBe(pool2);
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

  it("closes pool connections when relays change", async () => {
    const pool = await initPool();
    const closeSpy = spyOn(pool, "close");
    setRelays(["wss://example.com"]);
    expect(closeSpy).toHaveBeenCalled();
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

  it("uses stored hex private key when available", async () => {
    window.localStorage.setItem(
      "openslots_private_key",
      "0000000000000000000000000000000000000000000000000000000000000001",
    );
    const pubkey = await getMyPubkey();
    expect(pubkey).toBe("mock-pubkey");
  });

  it("recovers when stored nsec cannot be decoded", async () => {
    const decodeSpy = spyOn(nostrTools.nip19, "decode").mockImplementation(
      () => {
        throw new Error("bad nsec");
      },
    );
    window.localStorage.setItem("openslots_private_key", "nsec-invalid");
    const pubkey = await getMyPubkey();
    expect(pubkey).toBe("mock-pubkey");
    decodeSpy.mockRestore();
  });

  it("regenerates when stored key is invalid", async () => {
    window.localStorage.setItem("openslots_private_key", "not-a-key");
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
    expect(event.tags).toContainEqual(["t", "openslots"]);

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
    expect(event.tags).toContainEqual(["t", "openslots"]);
    const decrypted = await cryptoUtils.decryptData(event.content, MOCK_KEY);
    const parsed = JSON.parse(decrypted);
    expect(parsed.n).toBe("Alice");
    expect(parsed.o).toBe("10");
  });

  it("ignores responses with mismatched d tags", async () => {
    const pool = await initPool();
    const rootEvent = {
      id: "root-1",
      content: `encrypted-${JSON.stringify({ t: "Room", s: 1800, o: "1" })}`,
      tags: [],
    };
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(rootEvent);
    const subMock = pool.subscribe as unknown as ReturnType<typeof mock>;

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    if (!result) throw new Error("Expected room result");

    const subscription = subMock.mock.results[0]?.value as
      | { close: ReturnType<typeof mock> }
      | undefined;
    const params = subMock.mock.calls[0]?.[2] as
      | { onevent?: (event: NostrEvent) => void }
      | undefined;
    const emit = params?.onevent;
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-1",
      kind: 30078,
      pubkey: "attacker-pubkey",
      tags: [["d", "response-victim-root-1"]],
      content: `encrypted-${JSON.stringify({ n: "Eve", o: "1" })}`,
      created_at: 100,
      sig: "sig",
    });

    await Promise.resolve();
    expect(store.upsertResponse).not.toHaveBeenCalled();
    result.sub.stop();
    expect(subscription?.close).toHaveBeenCalled();
  });

  it("ignores responses without d tags", async () => {
    const pool = await initPool();
    const rootEvent = {
      id: "root-1",
      content: `encrypted-${JSON.stringify({ t: "Room", s: 1800, o: "1" })}`,
      tags: [],
    };
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(rootEvent);
    const subMock = pool.subscribe as unknown as ReturnType<typeof mock>;

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    if (!result) throw new Error("Expected room result");

    const params = subMock.mock.calls[0]?.[2] as
      | { onevent?: (event: NostrEvent) => void }
      | undefined;
    const emit = params?.onevent;
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-2",
      kind: 30078,
      pubkey: "attacker-pubkey",
      tags: [],
      content: `encrypted-${JSON.stringify({ n: "Eve", o: "1" })}`,
      created_at: 101,
      sig: "sig",
    });

    await Promise.resolve();
    expect(store.upsertResponse).not.toHaveBeenCalled();
  });

  it("returns null when room payload cannot be decrypted", async () => {
    const pool = await initPool();
    const rootEvent = {
      id: "root-1",
      content: "encrypted-{bad",
      tags: [],
    };
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(rootEvent);

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    expect(result).toBeNull();
  });

  it("returns null when no room event exists", async () => {
    const pool = await initPool();
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(null);

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    expect(result).toBeNull();
  });

  it("updates responses when d tag matches signer", async () => {
    const pool = await initPool();
    const rootEvent = {
      id: "root-1",
      content: `encrypted-${JSON.stringify({ t: "Room", s: 1800, o: "1" })}`,
      tags: [],
    };
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(rootEvent);
    const subMock = pool.subscribe as unknown as ReturnType<typeof mock>;

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    if (!result) throw new Error("Expected room result");

    const params = subMock.mock.calls[0]?.[2] as
      | { onevent?: (event: NostrEvent) => void }
      | undefined;
    const emit = params?.onevent;
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-1",
      kind: 30078,
      pubkey: "user-1",
      tags: [["d", "response-user-1-root-1"]],
      content: `encrypted-${JSON.stringify({ n: "Alice", o: "1" })}`,
      created_at: 100,
      sig: "sig",
    });

    await Promise.resolve();
    expect(store.upsertResponse).toHaveBeenCalledWith("user-1", {
      slots: new Set(["1800"]),
      name: "Alice",
      timestamp: 100,
    });
  });

  it("records decryption errors for responses", async () => {
    const pool = await initPool();
    const rootEvent = {
      id: "root-1",
      content: `encrypted-${JSON.stringify({ t: "Room", s: 1800, o: "1" })}`,
      tags: [],
    };
    const getMock = pool.get as unknown as ReturnType<typeof mock>;
    getMock.mockResolvedValue(rootEvent);
    const subMock = pool.subscribe as unknown as ReturnType<typeof mock>;

    const result = await subscribeToRoom("blinded-root-1", MOCK_KEY);
    if (!result) throw new Error("Expected room result");

    const params = subMock.mock.calls[0]?.[2] as
      | { onevent?: (event: NostrEvent) => void }
      | undefined;
    const emit = params?.onevent;
    if (!emit) throw new Error("Missing event handler");

    await emit({
      id: "response-3",
      kind: 30078,
      pubkey: "user-2",
      tags: [["d", "response-user-2-root-1"]],
      content: "encrypted-{bad",
      created_at: 200,
      sig: "sig",
    });

    await Promise.resolve();
    expect(store.upsertResponse).toHaveBeenCalledWith("user-2", {
      slots: new Set(),
      name: "Decryption Error",
      timestamp: 200,
    });
  });
});
