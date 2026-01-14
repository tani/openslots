// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

const SLOT_SECONDS = 30 * 60;

export type SlotMask = {
  start: number;
  mask: string;
};

export function buildSlotMask(slots: string[]): SlotMask {
  if (slots.length === 0) {
    return { start: 0, mask: "" };
  }
  const epochs = slots.map((value) => Number(value)).sort((a, b) => a - b);
  const start = epochs[0];
  const end = epochs[epochs.length - 1] + SLOT_SECONDS;
  const length = Math.max(0, Math.ceil((end - start) / SLOT_SECONDS));
  const bits = Array.from({ length }, () => "0");

  for (const epoch of epochs) {
    const index = Math.floor((epoch - start) / SLOT_SECONDS);
    if (index >= 0 && index < bits.length) {
      bits[index] = "1";
    }
  }

  return { start, mask: bits.join("") };
}

export function decodeSlotMask(start: number, mask: string): string[] {
  const slots: string[] = [];
  if (!mask) return slots;

  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i] === "1") {
      slots.push(String(start + i * SLOT_SECONDS));
    }
  }
  return slots;
}

export function buildSelectionMask(
  start: number,
  length: number,
  selections: Set<string>,
): string {
  if (length <= 0) return "";
  const bits = Array.from({ length }, () => "0");
  for (const slot of selections) {
    const index = Math.floor((Number(slot) - start) / SLOT_SECONDS);
    if (index >= 0 && index < bits.length) {
      bits[index] = "1";
    }
  }
  return bits.join("");
}
