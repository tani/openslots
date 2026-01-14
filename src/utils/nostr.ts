// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import type { Filter, Event as NostrEvent } from "nostr-tools";
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  nip19,
  SimplePool,
} from "nostr-tools";
import { upsertResponse } from "../signals/store";
import {
  decryptData,
  deriveBlindedId,
  deriveResponseId,
  encryptData,
} from "./crypto";
import { buildSelectionMask, buildSlotMask, decodeSlotMask } from "./slots";

const DEFAULT_RELAYS = [
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.wine",
];

export function getRelays(): string[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_RELAYS;
  }
  const saved = window.localStorage.getItem("openslots_relays");
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore error
    }
  }
  return DEFAULT_RELAYS;
}

export function setRelays(relays: string[]) {
  window.localStorage.setItem("openslots_relays", JSON.stringify(relays));
  _resetPool();
}

let poolInstance: SimplePool | null = null;
let signerKey: Uint8Array | null = null;

function getStorageKey(): string {
  return "openslots_private_key";
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("Invalid hex string");
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.substr(i * 2, 2), 16);
  }
  return bytes;
}

function parsePrivateKey(value: string): Uint8Array | null {
  if (value.startsWith("nsec")) {
    try {
      const decoded = nip19.decode(value);
      if (decoded.type === "nsec") {
        return decoded.data as Uint8Array;
      }
    } catch {
      return null;
    }
  }
  if (/^[0-9a-f]{64}$/i.test(value)) {
    return hexToBytes(value);
  }
  return null;
}

async function getSignerKey(): Promise<Uint8Array> {
  if (signerKey) return signerKey;
  if (typeof window === "undefined" || !window.localStorage) {
    signerKey = generateSecretKey();
    return signerKey;
  }

  const existing = window.localStorage.getItem(getStorageKey());
  if (existing) {
    const decoded = parsePrivateKey(existing);
    if (decoded) {
      signerKey = decoded;
      return signerKey;
    }
  }

  signerKey = generateSecretKey();
  window.localStorage.setItem(getStorageKey(), nip19.nsecEncode(signerKey));
  return signerKey;
}

export async function getMyPubkey(): Promise<string> {
  const sk = await getSignerKey();
  return getPublicKey(sk);
}

export async function initPool() {
  if (!poolInstance) {
    poolInstance = new SimplePool();
  }
  return poolInstance;
}

export function _resetPool() {
  if (poolInstance) {
    poolInstance.close(getRelays());
  }
  poolInstance = null;
  signerKey = null;
}

export async function publishRoom(input: {
  roomId: string;
  title: string;
  options: string[];
  roomKey: string;
}) {
  const blindedId = await deriveBlindedId(input.roomId, input.roomKey);
  const { start, mask } = buildSlotMask(input.options);
  const encryptedContent = await encryptData(
    JSON.stringify({ t: input.title, s: start, o: mask }),
    input.roomKey,
  );
  const sk = await getSignerKey();
  const event = finalizeEvent(
    {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["d", blindedId],
        ["t", "openslots"],
        // title/options hidden
      ],
      content: encryptedContent,
    },
    sk,
  );

  const pool = await initPool();
  await pool.publish(getRelays(), event);
  return event;
}

export async function publishResponse(input: {
  rootId: string;
  name: string;
  slots: Set<string>;
  roomKey: string;
  slotStart: number;
  slotCount: number;
}) {
  const sk = await getSignerKey();
  const pubkey = getPublicKey(sk);
  const responseId = await deriveResponseId(
    pubkey,
    input.rootId,
    input.roomKey,
  );
  const selectionMask = buildSelectionMask(
    input.slotStart,
    input.slotCount,
    input.slots,
  );
  const encryptedContent = await encryptData(
    JSON.stringify({ n: input.name, o: selectionMask }),
    input.roomKey,
  );
  const event = finalizeEvent(
    {
      kind: 30078,
      created_at: Math.floor(Date.now() / 1000),
      tags: [
        ["e", input.rootId],
        ["d", responseId],
        ["t", "openslots"],
      ],
      content: encryptedContent,
    },
    sk,
  );

  const pool = await initPool();
  await pool.publish(getRelays(), event);
  return event;
}

export async function subscribeToRoom(blindedRoomId: string, roomKey: string) {
  const pool = await initPool();
  const root = await pool.get(getRelays(), {
    kinds: [30078],
    "#d": [blindedRoomId],
    "#t": ["openslots"],
  });
  if (!root) return null;

  let roomTitle = "Untitled";
  let slotStart = 0;
  let slotMask = "";
  let slots: string[] = [];
  try {
    const decoded = await decryptData(root.content, roomKey);
    const data = JSON.parse(decoded) as { t?: string; s?: number; o?: string };
    roomTitle = data.t?.trim() || "Untitled";
    slotStart = Number(data.s ?? 0);
    slotMask = data.o ?? "";
    slots = decodeSlotMask(slotStart, slotMask);
  } catch {
    return null;
  }

  const filter: Filter = {
    kinds: [30078],
    "#e": [root.id],
    "#t": ["openslots"],
  };
  const sub = pool.subscribe(getRelays(), filter, {
    onevent: async (event: NostrEvent) => {
      // Avoid processing root event as response
      if (event.id === root.id) return;

      const responseTag = event.tags.find((t) => t[0] === "d")?.[1];
      if (!responseTag) return;

      const expected = await deriveResponseId(event.pubkey, root.id, roomKey);
      if (expected !== responseTag) return;

      let name = "Anonymous";
      let slots = new Set<string>();

      try {
        const decoded = await decryptData(event.content, roomKey);
        const data = JSON.parse(decoded) as { n?: string; o?: string };
        name = data.n?.trim() || "Anonymous";
        slots = new Set(decodeSlotMask(slotStart, data.o ?? ""));
      } catch {
        name = "Decryption Error";
      }

      upsertResponse(event.pubkey, {
        slots,
        name,
        timestamp: event.created_at ?? 0,
      });
    },
  });

  return {
    root,
    sub: { stop: () => sub.close() },
    room: { title: roomTitle, slots, slotStart, slotMask },
  };
}
