# Repository Guidelines

## Project Structure & Module Organization
- `src/` holds application code.
  - `src/pages/` contains route-level screens (`CreateRoom`, `JoinRoom`).
  - `src/components/` houses UI primitives like `Grid`, `Slot`, `Header`, `Sidebar`.
  - `src/signals/` keeps global state (`store.ts`).
  - `src/utils/` includes Nostr + Temporal helpers.
- `tests/` contains Bun tests (e.g., `tests/temporal.test.ts`).
- `index.ts` is the Bun build/serve entry that generates `dist/`.
- `uno.config.ts` configures UnoCSS.

## Build, Test, and Development Commands
- `bun install` installs dependencies.
- `bun run dev` builds assets and serves the SPA on `PORT` (default `3000`).
  - Example: `PORT=3001 bun run dev`.
- `bun test` runs unit tests in `tests/`.

## Coding Style & Naming Conventions
- TypeScript/TSX with 2-space indentation and double quotes.
- Components use `PascalCase` file names (`Grid.tsx`) and exports.
- Utility modules are `camelCase` or descriptive (`temporal.ts`, `nostr.ts`).
- Keep CSS in UnoCSS utility classes; avoid external UI libraries.

## Testing Guidelines
- Test framework: `bun:test`.
- Test files live in `tests/` and end with `.test.ts`.
- Add tests for Temporal logic and signal/state behavior.
- Run locally with `bun test` before submitting changes.

## Commit & Pull Request Guidelines
- No commit history exists yet, so no established message convention.
- Use concise, imperative commit messages (e.g., "Add grid drag selection").
- PRs should include: summary, test status, and screenshots for UI changes.

## Configuration Notes
- Nostr relays are configured in `src/utils/nostr.ts`.
- `index.ts` generates `dist/index.html` and `dist/index.css` during build.
