/// <reference lib="dom" />
import { afterEach, expect, test } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { AppHeader } from "../src/components/AppHeader";

afterEach(() => {
  cleanup();
});

test("AppHeader renders brand and toggles offcanvas", async () => {
  render(<AppHeader />);

  expect(screen.getByText("When2Nostr")).toBeTruthy();

  const toggler = screen.getByLabelText("Toggle settings");
  const panel = screen.getByRole("dialog", { hidden: true });

  expect(panel.getAttribute("aria-hidden")).toBe("true");
  expect(screen.queryByLabelText("Close settings")).toBeNull();

  await fireEvent.click(toggler);

  expect(panel.getAttribute("aria-hidden")).toBe("false");
  expect(screen.getByLabelText("Close settings")).toBeTruthy();
  expect(screen.getByText("Nostr Relays")).toBeTruthy();

  await fireEvent.click(screen.getByLabelText("Close settings"));

  expect(panel.getAttribute("aria-hidden")).toBe("true");
  expect(screen.queryByLabelText("Close settings")).toBeNull();
});

test("AppHeader closes via header close button", async () => {
  render(<AppHeader />);

  await fireEvent.click(screen.getByLabelText("Toggle settings"));
  expect(screen.getByText("Nostr Relays")).toBeTruthy();

  await fireEvent.click(screen.getByLabelText("Close"));
  const panel = screen.getByRole("dialog", { hidden: true });
  expect(panel.getAttribute("aria-hidden")).toBe("true");
});
