import { describe, expect, it } from "bun:test";
import { Temporal } from "@js-temporal/polyfill";
import {
  generateSlots,
  toLocalDate,
  toLocalDisplay,
} from "../src/utils/temporal";

describe("temporal utils", () => {
  it("generates 15-minute slots in UTC", () => {
    const slots = generateSlots("2024-01-01", "09:00", "10:00", "UTC");
    expect(slots.length).toBe(4);
    const times = slots.map((epoch) =>
      Temporal.Instant.fromEpochSeconds(Number(epoch))
        .toZonedDateTimeISO("UTC")
        .toPlainTime()
        .toString(),
    );
    expect(times).toEqual(["09:00:00", "09:15:00", "09:30:00", "09:45:00"]);
  });

  it("handles overnight ranges", () => {
    const slots = generateSlots("2024-01-01", "23:30", "00:30", "UTC");
    expect(slots.length).toBe(4);
    const dates = slots.map((epoch) => toLocalDate(epoch, "UTC").toString());
    expect(dates).toEqual([
      "2024-01-01",
      "2024-01-01",
      "2024-01-02",
      "2024-01-02",
    ]);
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
      }).epochSeconds,
    );
    const local = toLocalDisplay(epoch, "Asia/Tokyo");
    expect(local.toString()).toBe("09:00:00");
  });
});
