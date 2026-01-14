// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { beforeEach, describe, expect, it } from "bun:test";
import {
  clearResponses,
  currentSelections,
  heatmap,
  participantCount,
  responses,
  setSelections,
  updateSelection,
  upsertResponse,
} from "../src/signals/store";

function entry(slots: string[], timestamp: number) {
  return { slots: new Set(slots), name: "User", timestamp };
}

describe("store signals", () => {
  beforeEach(() => {
    clearResponses();
  });

  it("computes heatmap counts", () => {
    upsertResponse("pubkey-1", entry(["a", "b"], 10));
    upsertResponse("pubkey-2", entry(["b"], 11));

    expect(participantCount.value).toBe(2);
    expect(heatmap.value.get("a")).toBe(1);
    expect(heatmap.value.get("b")).toBe(2);
  });

  it("keeps the newest response per pubkey", () => {
    upsertResponse("pubkey-1", entry(["a"], 10));
    upsertResponse("pubkey-1", entry(["b"], 9));
    expect(Array.from(responses.value.get("pubkey-1")?.slots ?? [])).toEqual([
      "a",
    ]);

    upsertResponse("pubkey-1", entry(["c"], 12));
    expect(Array.from(responses.value.get("pubkey-1")?.slots ?? [])).toEqual([
      "c",
    ]);
  });

  it("updates selections when toggling slots", () => {
    setSelections(new Set(["a"]));
    updateSelection("b", true);
    updateSelection("a", false);
    expect(Array.from(currentSelections.value)).toEqual(["b"]);
  });
});
