// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { describe, expect, it } from "bun:test";
import { Temporal } from "temporal-polyfill-lite";
import {
  generateSlots,
  toLocalDate,
  toLocalDisplay,
} from "../src/utils/temporal";

describe("temporal utils", () => {
  it("generates 30-minute slots in UTC", () => {
    const slots = generateSlots("2024-01-01", "09:00", "10:00", "UTC");
    expect(slots.length).toBe(2);
    const times = slots.map((epoch) =>
      new Temporal.Instant(BigInt(epoch) * 1000000000n)
        .toZonedDateTimeISO("UTC")
        .toPlainTime()
        .toString(),
    );
    expect(times).toEqual(["09:00:00", "09:30:00"]);
  });

  it("handles overnight ranges", () => {
    const slots = generateSlots("2024-01-01", "23:30", "00:30", "UTC");
    expect(slots.length).toBe(2);
    const dates = slots.map((epoch) => toLocalDate(epoch, "UTC").toString());
    expect(dates).toEqual(["2024-01-01", "2024-01-02"]);
  });

  it("converts to local display time", () => {
    const epoch = String(
      Temporal.ZonedDateTime.from({
        timeZone: "UTC",
        year: 2024,
        month: 1,
        day: 1,
        hour: 0,
        minute: 0,
      }).epochNanoseconds / 1000000000n,
    );
    const local = toLocalDisplay(epoch, "Asia/Tokyo");
    expect(local.toString()).toBe("09:00:00");
  });
});
