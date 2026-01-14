// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { describe, expect, it } from "bun:test";
import {
  buildSelectionMask,
  buildSlotMask,
  decodeSlotMask,
} from "../src/utils/slots";

describe("slot utils", () => {
  it("builds empty mask when no slots are provided", () => {
    expect(buildSlotMask([])).toEqual({ start: 0, mask: "" });
  });

  it("decodes empty masks to no slots", () => {
    expect(decodeSlotMask(1000, "")).toEqual([]);
  });

  it("builds selection mask with out-of-range slots ignored", () => {
    const mask = buildSelectionMask(
      1000,
      2,
      new Set(["1000", "2800", "10000"]),
    );
    expect(mask).toBe("11");
  });
});
