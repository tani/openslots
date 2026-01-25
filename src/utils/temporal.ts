// SPDX-License-Identifier: GPL-3.0-or-later
// Copyright (C) 2025-present Masaya Taniguchi

import { Temporal } from "temporal-polyfill-lite";

export function generateSlots(
  date: string,
  start: string,
  end: string,
  tz: string,
): string[] {
  const plainDate = Temporal.PlainDate.from(date);
  const startTime = Temporal.PlainTime.from(start);
  const endTime = Temporal.PlainTime.from(end);

  const endDate =
    Temporal.PlainTime.compare(endTime, startTime) <= 0
      ? plainDate.add({ days: 1 })
      : plainDate;
  let cursor = plainDate.toZonedDateTime({
    timeZone: tz,
    plainTime: startTime,
  });
  const endZdt = endDate.toZonedDateTime({ timeZone: tz, plainTime: endTime });

  const slots: string[] = [];
  while (Temporal.ZonedDateTime.compare(cursor, endZdt) < 0) {
    slots.push(String(cursor.epochNanoseconds / 1000000000n));
    cursor = cursor.add({ minutes: 30 });
  }

  return slots;
}

export function toLocalDisplay(
  epoch: string,
  userTz: string,
): Temporal.PlainTime {
  const instant = new Temporal.Instant(BigInt(epoch) * 1000000000n);
  return instant.toZonedDateTimeISO(userTz).toPlainTime();
}

export function toLocalDate(epoch: string, userTz: string): Temporal.PlainDate {
  const instant = new Temporal.Instant(BigInt(epoch) * 1000000000n);
  return instant.toZonedDateTimeISO(userTz).toPlainDate();
}
