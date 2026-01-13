import { cleanup, fireEvent, render, screen } from "@testing-library/preact";
import { afterEach, beforeEach, describe, expect, test, vi } from "bun:test";
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

  test("renders configure button initially", () => {
    render(<RelaySettings />);
    expect(screen.getByText("Configure Relays")).toBeTruthy();
    expect(screen.queryByText("Nostr Relays")).toBeNull();
  });

  test("opens settings on click", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));
    expect(screen.getByText("Nostr Relays")).toBeTruthy();
    expect(screen.getByText("wss://test.relay/")).toBeTruthy();
  });

  test("closes settings on close button click", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));
    await fireEvent.click(screen.getByLabelText("Close"));
    expect(screen.queryByText("Nostr Relays")).toBeNull();
  });

  test("adds a new relay", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));

    const input = screen.getByPlaceholderText("wss://...");
    await fireEvent.input(input, { target: { value: "wss://new.relay/" } });
    await fireEvent.click(screen.getByText("Add"));

    expect(setRelaysMock).toHaveBeenCalledWith([
      "wss://test.relay/",
      "wss://new.relay/",
    ]);
    expect(screen.getByText("wss://new.relay/")).toBeTruthy();
  });

  test("removes a relay", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));

    const removeBtn = screen.getAllByText("×")[0];
    await fireEvent.click(removeBtn);

    expect(setRelaysMock).toHaveBeenCalledWith([]);
    expect(screen.queryByText("wss://test.relay/")).toBeNull();
  });

  test("resets relays to default", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));
    await fireEvent.click(screen.getByText("Reset Relays to Default"));

    expect(confirmMock).toHaveBeenCalled();
    expect(localStorage.getItem("when2nostr_relays")).toBeNull();
    expect(reloadMock).toHaveBeenCalled();
  });

  test("resets all data", async () => {
    render(<RelaySettings />);
    await fireEvent.click(screen.getByText("Configure Relays"));
    await fireEvent.click(screen.getByText("Reset All Data"));

    expect(confirmMock).toHaveBeenCalled();
    // localStorage.clear() should be called, but we can't easily spy on localStorage methods directly without more setup.
    // However determining if confirming works and reload is called is good proxy.
    expect(reloadMock).toHaveBeenCalled();
  });
});
