import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { RelaySettings } from "../src/components/RelaySettings";

// Mock utilities
const setRelaysMock = vi.fn();
vi.mock("../src/utils/nostr", () => ({
  getRelays: () => ["wss://test.relay/"],
  setRelays: (relays: string[]) => setRelaysMock(relays),
}));

// Mock window.location.reload
const reloadMock = vi.fn();
Object.defineProperty(window, "location", {
  value: { reload: reloadMock },
  writable: true,
});

// Mock confirm
const confirmMock = vi.fn(() => true);
window.confirm = confirmMock;

describe("RelaySettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders settings content", () => {
    render(<RelaySettings />);
    expect(screen.getByText("Nostr Relays")).toBeTruthy();
    expect(screen.getByText("wss://test.relay/")).toBeTruthy();
  });

  test("adds a new relay", async () => {
    render(<RelaySettings />);

    const input = screen.getByPlaceholderText("wss://...");
    await fireEvent.input(input, { target: { value: "wss://new.relay/" } });
    await fireEvent.click(screen.getByText("Add"));

    expect(setRelaysMock).toHaveBeenCalledWith([
      "wss://test.relay/",
      "wss://new.relay/",
    ]);
    expect(screen.getByText("wss://new.relay/")).toBeTruthy();
  });

  test("adds a new relay on Enter", async () => {
    render(<RelaySettings />);

    const input = screen.getByPlaceholderText("wss://...");
    await fireEvent.input(input, { target: { value: "wss://enter.relay/" } });
    await fireEvent.keyDown(input, { key: "Enter" });

    expect(setRelaysMock).toHaveBeenCalledWith([
      "wss://test.relay/",
      "wss://enter.relay/",
    ]);
  });

  test("removes a relay", async () => {
    render(<RelaySettings />);

    const removeBtn = screen.getAllByText("×")[0];
    await fireEvent.click(removeBtn);

    expect(setRelaysMock).toHaveBeenCalledWith([]);
    expect(screen.queryByText("wss://test.relay/")).toBeNull();
  });

  test("resets relays to default", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Reset Relays to Default"));

    expect(confirmMock).toHaveBeenCalled();
    expect(localStorage.getItem("openslots_relays")).toBeNull();
    expect(reloadMock).toHaveBeenCalled();
  });
});
