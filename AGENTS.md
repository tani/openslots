# Repository Guidelines

## Project Structure & Module Organization

- `src/` holds application code.
  - `src/pages/` contains route-level screens (`CreateRoom`, `JoinRoom`).
  - `src/components/` houses UI primitives like `Grid`, `Slot`, `AppHeader`, `Sidebar`.
  - `src/signals/` keeps global state (`store.ts`).
  - `src/utils/` includes Nostr + Temporal helpers.
- `tests/` contains Bun tests (e.g., `tests/temporal.test.ts`).
- `scripts/serve.ts` runs dev build + watch + SPA server.
- `scripts/build.ts` runs production build to `dist/`.
- `uno.config.ts` configures UnoCSS.

## Build, Test, and Development Commands

- `bun install` installs dependencies.
- `bun run dev` builds assets and serves the SPA on `PORT` (default `3000`).
  - Example: `PORT=3001 bun run dev`.
- `bun run build` builds assets to `dist/`.
- `bun test` runs unit tests in `tests/`.

## Coding Style & Naming Conventions

- TypeScript/TSX with 2-space indentation and double quotes.
- Components use `PascalCase` file names (`Grid.tsx`) and exports.
- Utility modules are `camelCase` or descriptive (`temporal.ts`, `nostr.ts`).
- Keep CSS in UnoCSS utility classes; avoid external UI libraries.

## State Management & Reactivity (Signals-First)

- **Prefer Signals over Hooks**: Use `@preact/signals` for all state. Use `useSignal`, `useComputed`, and `useSignalEffect` instead of `useState`, `useMemo`, and `useEffect`.
- **Intensive Signals Pattern**:
  - Initialize signals directly (e.g., from `localStorage`) to avoid mount effects.
  - Bind signal objects directly to JSX (e.g., `<div>{title}</div>`) for fine-grained DOM updates without full component re-renders.
  - Pass raw signals as props to child components for deep reactivity.
- **Declarative Effects**: Use `useSignalEffect` for side effects that depend on signal changes (e.g., syncing with `localStorage` or updating Nostr subscriptions).
- **Cleanup**: Always return cleanup functions from `useSignalEffect` where necessary (e.g., stopping NDK subscriptions).

## Testing Guidelines

- Test framework: `bun:test`.
- Test files live in `tests/` and end with `.test.ts` or `.test.tsx`.
- Add tests for Temporal logic and signal/state behavior.
- Run locally with `bun test` before submitting changes.

## Commit & Pull Request Guidelines

- Use concise, imperative commit messages (e.g., "Add grid drag selection").
PRs should include: summary, test status, and screenshots for UI changes.

## Configuration Notes

- Nostr relays are configured in `src/utils/nostr.ts`.
- Room/response events use Kind 30030 with NIP-44 encrypted payloads.
- Build output includes `dist/index.html` and `dist/index.css`.
- `bunfig.toml` enforces 100% coverage thresholds for tests.
