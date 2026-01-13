import { useSignal } from "@preact/signals";
import { getRelays, setRelays } from "../utils/nostr";

export function RelaySettings() {
  const relays = useSignal(getRelays());
  const newRelay = useSignal("");
  const isOpen = useSignal(false);

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

  if (!isOpen.value) {
    return (
      <button
        type="button"
        class="btn btn-link text-muted btn-sm"
        onClick={() => {
          isOpen.value = true;
        }}
      >
        Configure Relays
      </button>
    );
  }

  return (
    <div class="card p-3 mt-4">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <h6 class="mb-0 fw-bold">Nostr Relays</h6>
        <button
          type="button"
          class="btn-close"
          aria-label="Close"
          onClick={() => {
            isOpen.value = false;
          }}
        />
      </div>
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
      <div class="input-group input-group-sm">
        <input
          type="text"
          class="form-control"
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
          class="btn btn-outline-secondary"
          type="button"
          onClick={handleAdd}
        >
          Add
        </button>
      </div>

      <hr class="my-3" />

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

        <button
          type="button"
          class="btn btn-outline-danger btn-sm"
          onClick={() => {
            if (
              confirm(
                "Reset EVERYTHING? This will clear your name, private key, and custom relays.",
              )
            ) {
              localStorage.clear();
              location.reload();
            }
          }}
        >
          Reset All Data
        </button>
      </div>
    </div>
  );
}
