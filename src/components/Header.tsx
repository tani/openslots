import { useLocation } from "preact-iso";

export function Header() {
  const location = useLocation();
  return (
    <header class="flex items-center justify-between px-6 py-4 border-b border-ink/20 bg-paper/80 backdrop-blur-sm">
      <button
        type="button"
        class="text-xl font-bold tracking-tight text-ink"
        onClick={() => location.route("/")}
      >
        When2Nostr
      </button>
      <span class="text-xs uppercase tracking-[0.25em] text-ink/50">
        No accounts. Just time.
      </span>
    </header>
  );
}
