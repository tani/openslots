// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { beforeEach, describe, expect, test } from "bun:test";
import {
  decryptData,
  deriveBlindedId,
  deriveResponseId,
  encryptData,
  getOrCreateRoomKey,
} from "../src/utils/crypto";

// Mock window.location
const hashMock = { value: "" };
Object.defineProperty(window, "location", {
  value: {
    get hash() {
      return hashMock.value;
    },
    set hash(v) {
      hashMock.value = v;
    },
  },
  writable: true,
});

describe("Crypto Utils (Ultimate Privacy)", () => {
  beforeEach(() => {
    hashMock.value = "";
  });

  test("getOrCreateRoomKey generates random 32-byte hex key", () => {
    const key = getOrCreateRoomKey();
    expect(key).toHaveLength(64);
    expect(key).toMatch(/^[0-9a-f]+$/);
    expect(window.location.hash).toBe(key);
  });

  test("getOrCreateRoomKey reuses existing key from URL", () => {
    const existing =
      "00112233445566778899aabbccddeeff00112233445566778899aabbccddeeff";
    hashMock.value = `#${existing}`;
    const key = getOrCreateRoomKey();
    expect(key).toBe(existing);
    expect(key).toHaveLength(64);
  });

  test("deriveBlindedId is deterministic (HMAC matching)", async () => {
    const roomKey = getOrCreateRoomKey();
    const slotId = "1700000000"; // Example temporal epoch

    const blinded1 = await deriveBlindedId(slotId, roomKey);
    const blinded2 = await deriveBlindedId(slotId, roomKey);

    expect(blinded1).toEqual(blinded2);
    expect(blinded1).not.toEqual(slotId);
    expect(blinded1).toHaveLength(64); // SHA-256 hex
  });

  test("deriveBlindedId produces different outputs for different keys", async () => {
    const key1 =
      "0000000000000000000000000000000000000000000000000000000000000001";
    const key2 =
      "0000000000000000000000000000000000000000000000000000000000000002";
    const slotId = "1700000000";

    const blinded1 = await deriveBlindedId(slotId, key1);
    const blinded2 = await deriveBlindedId(slotId, key2);

    expect(blinded1).not.toEqual(blinded2);
  });

  test("deriveResponseId matches blinded pubkey-room concatenation", async () => {
    const roomKey = getOrCreateRoomKey();
    const pubkey = "pubkey-1";
    const roomId = "room-1";
    const responseId = await deriveResponseId(pubkey, roomId, roomKey);
    const expected = await deriveBlindedId(`${pubkey}:${roomId}`, roomKey);
    expect(responseId).toBe(expected);
  });

  test("encryptData and decryptData roundtrip (NIP-44)", () => {
    const roomKey = getOrCreateRoomKey();
    const secretMessage = JSON.stringify({
      title: "Top Secret Meeting",
      options: ["123", "456"],
    });

    const ciphertext = encryptData(secretMessage, roomKey);
    expect(ciphertext).not.toBe(secretMessage);
    // NIP-44 v2 produces base64 ciphertext usually
    expect(ciphertext.length).toBeGreaterThan(0);

    const decrypted = decryptData(ciphertext, roomKey);
    expect(decrypted).toBe(secretMessage);
  });
});
