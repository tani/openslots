import { useSignal } from "@preact/signals";
import { getRelays, setRelays } from "../utils/nostr";

export function RelaySettings() {
  const relays = useSignal(getRelays());
  const newRelay = useSignal("");

  const handleAdd = () => {
    if (!newRelay.value) return;
    const current = relays.value;
    if (current.includes(newRelay.value)) return;
    const next = [...current, newRelay.value];
    relays.value = next;
    setRelays(next);
    newRelay.value = "";
  };

  const handleRemove = (url: string) => {
    const next = relays.value.filter((r) => r !== url);
    relays.value = next;
    setRelays(next);
  };

  return (
    <div>
      <h6 class="mb-2 fw-bold">Nostr Relays</h6>
      <p class="small text-muted mb-3">
        Choose where room data is published and synced.
      </p>
      <ul class="list-group mb-3">
        {relays.value.map((url) => (
          <li
            key={url}
            class="list-group-item d-flex justify-content-between align-items-center p-2"
          >
            <span class="small text-break">{url}</span>
            <button
              type="button"
              class="btn btn-outline-danger btn-sm py-0 px-2"
              onClick={() => handleRemove(url)}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <div class="d-flex gap-2 mb-3">
        <input
          type="text"
          class="form-control form-control-sm"
          placeholder="wss://..."
          value={newRelay}
          onInput={(e) => {
            newRelay.value = e.currentTarget.value;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <button
          type="button"
          class="btn btn-primary btn-sm"
          onClick={handleAdd}
        >
          Add
        </button>
      </div>

      <div class="d-grid gap-2">
        <button
          type="button"
          class="btn btn-outline-secondary btn-sm"
          onClick={() => {
            if (confirm("Reset relays to default?")) {
              localStorage.removeItem("when2nostr_relays");
              location.reload();
            }
          }}
        >
          Reset Relays to Default
        </button>

        <div class="small text-muted">
          Relay changes only affect this browser.
        </div>
      </div>
    </div>
  );
}
