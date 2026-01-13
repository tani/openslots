import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { upsertResponse } from "../signals/store";
import { decryptData, deriveBlindedId, encryptData } from "./crypto";

const DEFAULT_RELAYS = [
  "wss://nos.lol",
  "wss://relay.damus.io",
  "wss://nostr.wine",
];

export function getRelays(): string[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return DEFAULT_RELAYS;
  }
  const saved = window.localStorage.getItem("when2nostr_relays");
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
  window.localStorage.setItem("when2nostr_relays", JSON.stringify(relays));
  _resetNDK();
}

let ndkInstance: NDK | null = null;

function getStorageKey(): string {
  return "when2nostr_private_key";
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
  event.kind = 10001;

  const blindedId = await deriveBlindedId(input.roomId, input.roomKey);
  const encryptedContent = encryptData(
    JSON.stringify({ title: input.title, options: input.options }),
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
  slots: string[];
  roomKey: string;
}) {
  const ndk = await initNDK();
  const event = new NDKEvent(ndk);
  event.kind = 10001;

  const encryptedName = encryptData(input.name, input.roomKey);
  const blindedSlots = await Promise.all(
    input.slots.map((s) => deriveBlindedId(s, input.roomKey)),
  );

  event.tags = [
    ["e", input.rootId],
    ["r", ...blindedSlots],
    ["name", encryptedName],
  ];
  event.content = "";
  await event.publish();
  return event;
}

export async function subscribeToRoom(blindedRoomId: string, roomKey: string) {
  const ndk = await initNDK();
  const root = await ndk.fetchEvent({ kinds: [10001], "#d": [blindedRoomId] });
  if (!root) return null;

  const sub = ndk.subscribe(
    { kinds: [10001], "#e": [root.id] },
    { closeOnEose: false },
  );

  sub.on("event", (event: NDKEvent) => {
    // Avoid processing root event as response
    if (event.id === root.id) return;

    // Helper to get tag values
    const getTag = (k: string) => event.tags.find((t) => t[0] === k)?.[1];

    // r tags: NIP-10 style references or multiple tags
    // Logic: Collect all 'r' tags.
    // Also support fallback to single 'r' tag with comma-separated values (legacy support if needed, but we are enforcing new format)
    // Actually, NDKEvent.tags is string[][].
    // Our publish uses ['r', h1, h2, ...] -> single tag with multiple values.
    // Or multiple tags?
    // publishResponse code: `['r', ...blindedSlots]`. This spreads into the array.
    // So it becomes `['r', 'hash1', 'hash2']`.
    // The previous code `['r', input.slots.join(',')]` was `['r', '1,2,3']`.
    // We moved to `['r', 'hash1', 'hash2']`.
    const rTag = event.tags.find((t) => t[0] === "r");
    const slots = new Set(rTag ? rTag.slice(1) : []);

    let name = getTag("name") ?? "";
    try {
      if (name) name = decryptData(name, roomKey);
    } catch {
      name = "Decryption Error";
    }
    if (!name) name = "Anonymous";

    upsertResponse(event.pubkey, {
      slots,
      name,
      timestamp: event.created_at ?? 0,
    });
  });

  return { root, sub };
}
