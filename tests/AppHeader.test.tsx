/// <reference lib="dom" />
import { expect, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/preact";
import { AppHeader } from "../src/components/AppHeader";

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
