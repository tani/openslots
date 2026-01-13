import NDK, { NDKEvent, NDKPrivateKeySigner } from "@nostr-dev-kit/ndk";
import { upsertResponse } from "../signals/store";

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

function tagValue(tags: string[][], key: string): string | null {
  const hit = tags.find((tag) => tag[0] === key);
  return hit?.[1] ?? null;
}

export async function publishRoom(input: {
  roomId: string;
  title: string;
  options: string[];
}) {
  const ndk = await initNDK();
  const event = new NDKEvent(ndk);
  event.kind = 10001;
  event.tags = [
    ["d", input.roomId],
    ["options", input.options.join(",")],
    ["title", input.title],
  ];
  event.content = "";
  await event.publish();
  return event;
}

export async function publishResponse(input: {
  rootId: string;
  name: string;
  slots: string[];
}) {
  const ndk = await initNDK();
  const event = new NDKEvent(ndk);
  event.kind = 10001;
  event.tags = [
    ["e", input.rootId],
    ["r", input.slots.join(",")],
    ["name", input.name],
  ];
  event.content = "";
  await event.publish();
  return event;
}

export async function subscribeToRoom(roomId: string) {
  const ndk = await initNDK();
  const root = await ndk.fetchEvent({ kinds: [10001], "#d": [roomId] });
  if (!root) return null;

  const sub = ndk.subscribe(
    { kinds: [10001], "#e": [root.id] },
    { closeOnEose: false }
  );

  sub.on("event", (event: NDKEvent) => {
    const selections = tagValue(event.tags, "r");
    const name = tagValue(event.tags, "name") ?? "Anonymous";
    const slots = new Set(
      selections ? selections.split(",").filter(Boolean) : []
    );
    upsertResponse(event.pubkey, {
      slots,
      name,
      timestamp: event.created_at ?? 0,
    });
  });

  return { root, sub };
}
