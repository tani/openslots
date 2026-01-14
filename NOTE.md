# Internal Flow & Mechanisms

When2Nostr is a lightweight scheduling SPA that uses Nostr relays as the
backing store. The UI is fully client-side; data is encrypted before it is
published and decrypted locally on read.

## Architecture Stack

- Frontend: Preact + preact-iso routing
- State: @preact/signals (signals-first, minimal hooks)
- Nostr SDK: @nostr-dev-kit/ndk
- Date/Time: @js-temporal/polyfill
- Styling: Bootstrap 5 + Bootswatch Brite
- Build: Bun build output to `dist/`, dev server with custom watcher

## Data Model (Nostr Events)

Both room and response events use Kind 30030 (Parameterized Replaceable).

### Room Event

- Kind: 30030
- Tags:
  - ["d", <HMAC(roomKey, roomUUID)>]
- Content:
  - Encrypted JSON via NIP-44: `{ t, s, o }`
  - `t`: title, `s`: start epoch seconds, `o`: bitstring of 30-minute slots

### Response Event

- Kind: 30030
- Tags:
  - ["e", <room_event_id>]
  - ["d", <HMAC(roomKey, pubkey:room_event_id)>]
- Content:
  - Encrypted JSON via NIP-44: `{ n, o }`
  - `n`: name, `o`: bitstring of selected slots

Blinding is done with HMAC-SHA256 using the room key so relay observers
cannot infer the room id or selected slots from tags alone.
Response `d` tags are deterministic per user+room, so each user has a single
replaceable response.

## Core Workflows

### 1) Room Creation (CreateRoom)

- User sets title/date/time/timezone.
- `generateSlots` builds 30-minute slots in the creator timezone and stores
  them as epoch seconds, then compresses them into `{ s, o }`.
- A random UUID and room key are generated.
- `publishRoom` encrypts `{ t, s, o }` with NIP-44 and publishes Kind 30030.
- User is routed to `/room/<UUID>#<roomKey>`.

### 2) Room Sync (JoinRoom)

- Reads the room key from the URL fragment.
- Blinds the room id and fetches the root event.
- Decrypts the content JSON into `t`, `s`, `o` and decodes the slot mask.
- Builds a grid by converting decoded epoch seconds into local date/time buckets.
- Subscribes to responses (`#e` tag referencing the room event).

### 3) State + Heatmap (signals/store)

- `responses`: Map of pubkey -> { slots, name, timestamp }
- `currentSelections`: local in-progress selection set
- `currentUserPubkey`: used to exclude the local user from heatmap
- `heatmap`: computed map of slot -> count for all other participants

### 4) Grid Interaction

- Drag-to-select toggles slots with add/remove mode.
- Selected slots are solid green.
- Unselected slots show a faint background; darker green indicates more
  participants are available.
- Sticky time column and header keep orientation while scrolling.

### 5) Relay Configuration

- Relays are stored in `localStorage` under `when2nostr_relays`.
- Changing relays resets the NDK instance so it reconnects on next use.
- Relay settings live in the header offcanvas.

## Build & Dev

- `bun run build`: production build to `dist/`
- `bun run dev`: build + watch + serve SPA from `dist/`
