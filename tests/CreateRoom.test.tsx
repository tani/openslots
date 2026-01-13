/// <reference lib="dom" />
import { expect, mock, spyOn, test } from "bun:test";
import { fireEvent, render, screen } from "@testing-library/preact";
import * as preactIso from "preact-iso";
import { CreateRoom } from "../src/pages/CreateRoom";
import * as nostrUtils from "../src/utils/nostr";

// Mock Nostr
spyOn(nostrUtils, "publishRoom").mockResolvedValue(
  {} as unknown as Awaited<ReturnType<typeof nostrUtils.publishRoom>>,
);

// Mock preact-iso
const mockRoute = mock(() => {});
spyOn(preactIso, "useLocation").mockReturnValue({
  route: mockRoute,
  path: "/",
} as unknown as ReturnType<typeof preactIso.useLocation>);

test("CreateRoom renders form and handles input", async () => {
  render(<CreateRoom />);

  const titleInput = screen.getByLabelText(/Title/i) as HTMLInputElement;
  fireEvent.input(titleInput, { target: { value: "New Meeting" } });
  expect(titleInput.value).toBe("New Meeting");

  const button = screen.getByText(/Create room/i);
  expect(button).toBeTruthy();
});
