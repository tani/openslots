// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { nip44 } from "nostr-tools";

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function toArrayBuffer(view: Uint8Array): ArrayBuffer {
  return Uint8Array.from(view).buffer;
}

const HKDF_SALT = "openslots-hkdf-salt";
const HKDF_INFO_ENCRYPT = "openslots:encryption";
const HKDF_INFO_HMAC = "openslots:hmac";

async function deriveHkdfBits(
  roomKey: string,
  info: string,
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(hexToBytes(roomKey)),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(HKDF_SALT),
      info: encoder.encode(info),
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

async function deriveHmacKey(roomKey: string): Promise<Uint8Array> {
  return deriveHkdfBits(roomKey, HKDF_INFO_HMAC);
}

async function deriveEncryptionKey(roomKey: string): Promise<Uint8Array> {
  return deriveHkdfBits(roomKey, HKDF_INFO_ENCRYPT);
}

/**
 * Retrieves or generates an encryption key from the URL fragment.
 * URL Example: /room/<UUID>#<HexKey>
 */
export function getOrCreateRoomKey(): string {
  if (typeof window === "undefined") return ""; // Safety for SSR/Tests without window

  let key = window.location.hash.replace("#", "");
  if (!key || key.length !== 64) {
    // Generate a 32-byte (64-character) random key
    key = Array.from(crypto.getRandomValues(new Uint8Array(32)))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    window.location.hash = key;
  }
  return key;
}

/**
 * Generates a public ID (Blinded ID) using HMAC-SHA256.
 * This prevents the original ID from being inferred from 'e' or 'd' tags on relays.
 */
export async function deriveBlindedId(
  rawId: string,
  roomKey: string,
): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = await deriveHmacKey(roomKey);
  const msgData = encoder.encode(rawId);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(keyData),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, msgData);

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function deriveResponseId(
  pubkey: string,
  roomEventId: string,
  roomKey: string,
): Promise<string> {
  return deriveBlindedId(`${pubkey}:${roomEventId}`, roomKey);
}

/**
 * Encrypts data using NIP-44 (uses roomKey as a symmetric key).
 */
export async function encryptData(
  plaintext: string,
  roomKey: string,
): Promise<string> {
  const keyBytes = await deriveEncryptionKey(roomKey);
  return nip44.v2.encrypt(plaintext, keyBytes);
}

export async function decryptData(
  ciphertext: string,
  roomKey: string,
): Promise<string> {
  const keyBytes = await deriveEncryptionKey(roomKey);
  return nip44.v2.decrypt(ciphertext, keyBytes);
}
