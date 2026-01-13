# Internal Flow & Mechanisms

Allows users to schedule meetings without a central server by leveraging the [Nostr](https://github.com/nostr-protocol/nostr) protocol/relays as a persistent data store.

## Architecture Stack

- **Frontend Framework**: [Preact](https://preactjs.com/) (Lightweight React alternative).
- **State Management**: [@preact/signals](https://preactjs.com/guide/v10/signals/) (Reactive state primitives).
- **Nostr SDK**: [@nostr-dev-kit/ndk](https://github.com/nostr-dev-kit/ndk) (Interaction with relays).
- **Date/Time**: [@js-temporal/polyfill](https://github.com/js-temporal/temporal-polyfill) (Modern immutable date-time handling).
- **Styling**: Bootstrap 5 + Bootswatch Brite theme (Component-based styling).

---

## Data Models (Nostr Events)

The application uses **Kind 10001** (Replaceable/Parameterized Replaceable) for both Rooms and Responses?
*Actually, the code uses `Kind 10001` for both, which is technically "Generic List". For the Room, it acts as the "Root" entity. For responses, they link to the room.*

### 1. The Room (Event)
- **Kind**: `10001`
- **Tags**:
  - `['d', <UUID>]`: Unique Identifier for the room (addressable).
  - `['title', <String>]`: Meeting title.
  - `['options', <CSV_Epochs>]`: Comma-separated list of Unix timestamps (seconds) representing available time slots.
- **Content**: Empty string.

### 2. The Response (Event)
- **Kind**: `10001`
- **Tags**:
  - `['e', <Room_Event_ID>]`: Reference to the Room event ID.
  - `['r', <CSV_Epochs>]`: Comma-separated list of **selected** timestamps keys.
  - `['name', <String>]`: Participant's display name.
- **Content**: Empty string.
- **Pubkey**: The participant's ephemeral or real pubkey.

---

## Core Workflows

### 1. Room Creation Flow (`CreateRoom.tsx`)
1.  **User Input**: Title, Date Range, Time Range, Timezone.
2.  **Slot Generation**:
    - Uses `utils/temporal.ts` -> `generateSlots`.
    - Iterates through days and time ranges in the **creator's timezone**.
    - Converts every 15-minute slot into a **UTC Unix Epoch**. This ensures time is absolute and timezone-agnostic on the backend.
3.  **Publishing**:
    - Generates a random `UUID`.
    - Calls `utils/nostr.ts` -> `publishRoom`.
    - NDK creates a signed event (Kind 10001, d-tag=UUID).
    - Event is broadcast to configured relays.
4.  **Redirect**: User is routed to `/room/<UUID>`.

### 2. Room Synchronization (`JoinRoom.tsx`)
1.  **Initialization**:
    - Mounts and calls `nostr.ts` -> `subscribeToRoom(UUID)`.
    - **Identity Sync**: Fetches `getMyPubkey()` and stores it in `currentUserPubkey` signal for local filtering.
2.  **Fetching Root**:
    - NDK fetches the Room event using filter `{ kinds: [10001], '#d': [UUID] }`.
    - If not found -> "Room not found".
3.  **Grid Reconstruction**:
    - Parses `options` tag (CSV epochs).
    - Converts epochs to **User's Local Time** using `temporal.ts`.
    - logically maps `Epoch -> Local Date/Time Key`.
4.  **Subscription**:
    - Subscribes to response events: `{ kinds: [10001], '#e': [Root_ID] }`.
    - **Live Updates**: As events arrive (EOSE or real-time), `sub.on("event")` triggers.
    - **Store Update**: Calls `store.ts` -> `upsertResponse`.
        - Responses are mapped by `pubkey`. Only the *newest* event per pubkey is kept (based on `created_at`).

### 3. State Management & Heatmap (`store.ts`)
The application uses a reactive store pattern.

- **`responses`**: `Signal<Map<Pubkey, { slots: Set<string>, name, timestamp }>>`
    - Contains the latest response from every participant.
- **`currentSelections`**: `Signal<Set<string>>`
    - The local user's currently selected slots (draft state).
- **`currentUserPubkey`**: `Signal<string>`
    - The active user's public key.
- **`heatmap`**: `Computed<Map<SlotID, Count>>`
    - **Critical Logic**: Iterates over `responses`.
    - **Exclusion**: Skips the entry matching `currentUserPubkey`. This ensures the heatmap represents *everyone else's* availability, preventing the user's previous (synced) vote from interfering with their local editing visual state.

### 4. Interactive Grid & Slots
- **`Grid.tsx`**: Renders the matrix.
    - Handles **Drag-to-Select**: Tracks `mousedown` and `mouseup`. Toggles selection based on the initial cell's state (add vs remove mode).
- **`Slot.tsx`**: The atomic cell unit.
    - **Visual State**:
        1.  **Selected (`currentSelections` has ID)**: Fully Opaque Green (User's choice).
        2.  **Not Selected**:
            - Opacity = `(Heatmap Count) / (Total Participants)`.
            - Shows consensus strength.
            - If Heatmap Count is 0 (no one else selected), opacity is 0 (White/Transparent).

### 5. Configurable Relays (`utils/nostr.ts`)
- **Storage**: `localStorage.getItem("when2nostr_relays")`.
- **Defaults**: `wss://nos.lol`, `wss://relay.damus.io`, `wss://nostr.wine`.
- **NDK Lifecycle**:
    - `initNDK` creates a singleton instance.
    - If relays change (`setRelays`), the singleton is explicitly nulled (`_resetNDK`), forcing a reconnection with new relays on the next usage.

### 6. Identity Management
- **Ephemeral Identity**:
    - On first load, `nostr.ts` generates a random private key (nsec).
    - Saved to `localStorage.getItem("when2nostr_private_key")`.
    - Used to sign all events.
- **Reset**: "Reset All Data" clears this key, effectively creating a clean slate/new identity.

