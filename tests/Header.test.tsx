/// <reference lib="dom" />
import { expect, test } from "bun:test";
import { render, screen } from "@testing-library/preact";
import { Header } from "../src/components/Header";

test("Header renders correctly", () => {
  render(<Header />);
  expect(screen.getByText("When2Nostr")).toBeTruthy();
  expect(screen.getByText(/No accounts. Just time./i)).toBeTruthy();
});
