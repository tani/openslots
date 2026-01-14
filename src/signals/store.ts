// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { computed, signal } from "@preact/signals";

export type ResponseEntry = {
  slots: Set<string>;
  name: string;
  timestamp: number;
};

export const responses = signal<Map<string, ResponseEntry>>(new Map());
export const currentUserPubkey = signal<string | null>(null);
export const currentSelections = signal<Set<string>>(new Set());

export const participantCount = computed(() => responses.value.size);

export const heatmap = computed(() => {
  const counts = new Map<string, number>();
  const myPubkey = currentUserPubkey.value;
  for (const [pubkey, { slots }] of responses.value.entries()) {
    if (pubkey === myPubkey) continue;
    for (const slot of slots) {
      counts.set(slot, (counts.get(slot) ?? 0) + 1);
    }
  }
  return counts;
});

export function upsertResponse(pubkey: string, entry: ResponseEntry) {
  const next = new Map(responses.value);
  const existing = next.get(pubkey);
  if (!existing || entry.timestamp >= existing.timestamp) {
    next.set(pubkey, entry);
    responses.value = next;
  }
}

export function clearResponses() {
  responses.value = new Map();
}

export function setSelections(slots: Set<string>) {
  currentSelections.value = new Set(slots);
}

export function updateSelection(slot: string, shouldAdd: boolean) {
  const next = new Set(currentSelections.value);
  if (shouldAdd) {
    next.add(slot);
  } else {
    next.delete(slot);
  }
  currentSelections.value = next;
}
