/// <reference lib="dom" />
import { afterEach, expect, test } from "bun:test";
import { cleanup, render, screen } from "@testing-library/preact";
import { Grid } from "../src/components/Grid";

afterEach(() => {
  cleanup();
});

test("Grid renders dates and times", () => {
  const dates = ["2026-01-13", "2026-01-14"];
  const times = ["09:00", "10:00"];
  const slotByLocalKey = new Map([
    ["2026-01-13|09:00", "slot-1"],
    ["2026-01-14|10:00", "slot-2"],
  ]);

  render(
    <Grid dates={dates} times={times} slotByLocalKey={slotByLocalKey} />,
  );

  expect(screen.getByText("2026-01-13")).toBeTruthy();
  expect(screen.getByText("2026-01-14")).toBeTruthy();
  expect(screen.getByText("09:00")).toBeTruthy();
  expect(screen.getByText("10:00")).toBeTruthy();
});
