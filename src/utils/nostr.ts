// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
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
  _resetNDK();
}

let ndkInstance: NDK | null = null;

function getStorageKey(): string {
  return "openslots_private_key";
}

async function getSigner() {
  if (typeof window === "undefined" || !window.localStorage) {
    return NDKPrivateKeySigner.generate();
  }

  const existing = window.localStorage.getItem(getStorageKey());
  if (existing) {
    return new NDKPrivateKeySigner(existing);
  }

  const signer = NDKPrivateKeySigner.generate();
  const key = await signer.nsec;
  window.localStorage.setItem(getStorageKey(), key);
  return signer;
}

export async function getMyPubkey(): Promise<string> {
  const signer = await getSigner();
  const user = await signer.user();
  return user.pubkey;
}

export async function initNDK() {
  if (ndkInstance) return ndkInstance;

  const ndk = new NDK({ explicitRelayUrls: getRelays() });
  ndk.signer = await getSigner();
  await ndk.connect();
  ndkInstance = ndk;
  return ndk;
}

export function _resetNDK() {
  ndkInstance = null;
}

export async function publishRoom(input: {
  roomId: string;
  title: string;
  options: string[];
  roomKey: string;
}) {
  const ndk = await initNDK();
  const event = new NDKEvent(ndk);
  event.kind = 30030;

  const blindedId = await deriveBlindedId(input.roomId, input.roomKey);
  const { start, mask } = buildSlotMask(input.options);
  const encryptedContent = await encryptData(
    JSON.stringify({ t: input.title, s: start, o: mask }),
    input.roomKey,
  );

  event.tags = [
    ["d", blindedId],
    // title/options hidden
  ];
  event.content = encryptedContent;
  await event.publish();
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
  const ndk = await initNDK();
  const event = new NDKEvent(ndk);
  event.kind = 30030;

  const pubkey = await getMyPubkey();
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
  event.tags = [
    ["e", input.rootId],
    ["d", responseId],
  ];
  event.content = await encryptData(
    JSON.stringify({ n: input.name, o: selectionMask }),
    input.roomKey,
  );
  await event.publish();
  return event;
}

export async function subscribeToRoom(blindedRoomId: string, roomKey: string) {
  const ndk = await initNDK();
  const root = await ndk.fetchEvent({ kinds: [30030], "#d": [blindedRoomId] });
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

  const sub = ndk.subscribe(
    { kinds: [30030], "#e": [root.id] },
    { closeOnEose: false },
  );

  sub.on("event", async (event: NDKEvent) => {
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
  });

  return { root, sub, room: { title: roomTitle, slots, slotStart, slotMask } };
}
