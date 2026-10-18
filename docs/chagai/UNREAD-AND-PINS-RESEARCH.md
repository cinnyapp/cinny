# "Mark as unread" + "Pin messages" — research & design decision

Research pass before any code, for the `claude/cinny-unread-pin` branch (off `dev@5af39f5`).
Goal: add both features using **the same Matrix events the other clients already use**, so a
mark/pin made here is understood by Element Web, Element X, FluffyChat and upstream Cinny — and
vice versa.

**Bottom line (read this and skip the rest if you want):**

| Feature        | Standard event                                    | Already in this fork?                                           | What we do                                                                                                  |
| -------------- | ------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Pin messages   | `m.room.pinned_events` (state event)              | **YES — fully implemented upstream, already merged into `dev`** | Keep upstream's implementation. Add only the missing piece: a pinned **banner** at the top of the timeline. |
| Mark as unread | `m.marked_unread` (room account data, spec v1.12) | **NO — nothing, upstream has never implemented it**             | Implement from scratch, copying Element Web's/FluffyChat's exact event semantics.                           |

---

## 1. Mark as unread

### 1.1 The spec

- **MSC2867 — "Marking rooms as unread"**
  <https://github.com/matrix-org/matrix-spec-proposals/blob/main/proposals/2867-rooms_marked_unread.md>
  (file name is `2867-rooms_marked_unread.md`, not `2867-unread-rooms.md`).
- **Stable since Matrix spec v1.12**, Client-Server API § _Read and unread markers → Unread
  markers_: <https://spec.matrix.org/v1.12/client-server-api/#unread-markers>
  (spec source: `content/client-server-api/modules/read_markers.md`, marked `{{% added-in
v="1.12" %}}`; event schema `data/event-schemas/schema/m.marked_unread.yaml`).
  Note: the task brief said v1.11 — the correct version is **v1.12** (released 2024-10-07).

**Event** — _room_ account data (per-room, per-user; not room state, not global account data):

```
PUT /_matrix/client/v3/user/{userId}/rooms/{roomId}/account_data/m.marked_unread
{ "unread": true }
```

Schema (`m.marked_unread.yaml`): `content.unread` is a **required boolean**. Absent event ⇒
clients MUST behave as if `unread` were `false`.

**Unstable prefix:** `com.famedly.marked_unread` — same content. Famedly/FluffyChat shipped it
before stabilisation; the MSC tells implementers who used it to migrate users to the stable key.

**Normative client behaviour (verbatim points from the spec):**

- Clients MUST update the marker by **directly writing the room account data** (there is no
  dedicated API endpoint, unlike `m.fully_read` which must go through `/read_markers`).
- When marking a room unread, clients **SHOULD NOT** touch `m.fully_read` — the user's read
  position in the room is preserved.
- When `unread` is `true`, clients SHOULD visually annotate the room; RECOMMENDED to use "a
  treatment similar to how they represent rooms with unread notifications". MSC2867 is more
  concrete: _"of similar visual importance to a non-highlight notification badge **without the
  notification count**"_ — i.e. **a dot, not a number**. If real notifications arrive after the
  mark, show the count as normal.
- Clients SHOULD reset the marker (`unread: false`) **when opening a room to display its
  timeline**.
- Clients that offer "mark as read" (sending a receipt for the last event) SHOULD reset the
  marker **at the same time**.
- Servers have no additional requirements — it is pure client-side account data, so **his
  Synapse already supports it today**, no server change needed.

### 1.2 What the other clients actually do

Checked against each project's current source, not documentation.

| Client / SDK                                                                                 | Reads                                                                                                                                  | Writes                                                                                                                                                         | Clears when                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Element Web** (`apps/web/src/utils/notifications.ts`)                                      | `getMarkedUnreadState()` = stable `m.marked_unread` **??** unstable `com.famedly.marked_unread` (stable wins)                          | `setMarkedUnreadState()` → `client.setRoomAccountData(roomId, EventType.MarkedUnread, {unread})`, **stable key only**, and it no-ops if the value is unchanged | (a) `clearRoomNotification()` — the explicit "Mark as read" — calls `setMarkedUnreadState(room, client, false)` _before_ sending the receipt; (b) `RoomViewStore` clears it on the `ViewRoom` dispatch, i.e. **once per room open** |
| **Element X** (matrix-rust-sdk `crates/matrix-sdk/src/room/mod.rs`)                          | `BaseRoom::is_marked_unread()`                                                                                                         | `Room::set_unread_flag(unread)` (writes `MarkedUnreadEventContent`, no-ops if unchanged)                                                                       | called with `false` from the mark-as-read paths; Element X Android ships a `ic_compound_mark_as_unread` icon for the room-list long-press menu                                                                                      |
| **FluffyChat** (famedly `matrix-dart-sdk`, `lib/src/room.dart` + `utils/marked_unread.dart`) | `Room.markedUnread` = `m.marked_unread` content **??** `com.famedly.marked_unread` content (stable first, unstable fallback)           | `Room.markUnread(bool)` → `setAccountDataPerRoom(..., 'm.marked_unread', ...)`, **stable key only**, no-ops if unchanged, refuses on non-joined rooms          | `Room.isUnread => notificationCount > 0 \|\| markedUnread`                                                                                                                                                                          |
| **Ruma** (`crates/ruma-events/src/marked_unread.rs`)                                         | both; the unstable type is behind the `unstable-msc2867` cargo feature purely "to migrate data from the unstable to the stable prefix" | n/a                                                                                                                                                            | n/a                                                                                                                                                                                                                                 |
| **upstream Cinny**                                                                           | **nothing.** `git grep -i marked_unread upstream/dev -- src/` ⇒ 0 hits; no commit in upstream history mentions it.                     | —                                                                                                                                                              | —                                                                                                                                                                                                                                   |

**Element Web also uses the flag in room-list filtering** (`UnreadFilter.matches()` returns true
for a marked-unread room before looking at notification counts) and sorting (`UnreadSorter`).

### 1.3 Decision — and one deliberate deviation from the brief

- **Write the stable `m.marked_unread` key only.** The brief asked to write _both_ stable and
  unstable "like Element Web" — but Element Web, Element X and FluffyChat all write **stable
  only** and only _read_ the unstable key as a fallback. Writing both is actually worse for
  interop: a legacy client that reads _only_ `com.famedly.marked_unread` would then see a flag
  that a modern client clears on the stable key but not the unstable one, and the room would be
  stuck unread forever in that client.
- **Read both, stable first** (`stable ?? unstable`) — identical to Element Web and FluffyChat,
  so a mark set by an old FluffyChat shows up here.
- **Extra courtesy:** when _clearing_, if a leftover unstable `com.famedly.marked_unread` with
  `unread: true` exists, clear that too. This is the migration the MSC asks for and it costs one
  extra PUT only in the rare legacy case.
- **No-op writes are skipped** (compare current state first), like all three reference clients —
  important on an 8.7k-room account where a bulk "Mark as Read" would otherwise fire thousands of
  pointless PUTs.
- **Never touch `m.fully_read`.**

### 1.4 Where the flag gets cleared in _this_ codebase

Cinny sends read receipts from **two** kinds of place and they must be treated differently:

- **Explicit** — the "Mark as Read" menu items (room-list item, room header, timeline button,
  Home/Direct/Space bulk "Mark as Read", notification inbox) and the Escape-key shortcut. These
  are the spec's "mark a room as read" ⇒ **clear the flag**.
- **Automatic** — `tryAutoMarkAsRead()` in `RoomTimeline.tsx`, which fires whenever the bottom
  anchor is on screen, the window regains focus, or a new live event arrives while you are at the
  live end. These must **not** clear the flag, otherwise marking the room you are currently
  looking at as unread would be undone within milliseconds.

So `markAsRead()` grows a fourth parameter `clearMarkedUnread = true` (default on, so all the
explicit and bulk call sites get the correct behaviour for free), and the four automatic call
sites in `RoomTimeline.tsx` pass `false`.

The "clear when opening the room" half of the spec is a single effect in `Room.tsx`, keyed on
`room.roomId` — the direct analogue of Element Web's `ViewRoom` dispatch handler: it runs once
per room open, so marking the room you are _in_ as unread sticks until you navigate away and come
back. That is exactly Element's behaviour.

### 1.5 Fitting it to the existing unread machinery (do not regress the back-lag fix)

`dev` carries three perf commits (`b1df4c5`, `8b55c71`, `fb9bdf5`, the `claude/back-lag-fix`
work) that make `roomToUnreadAtom` batch per-`/sync` updates (`BULK`) and slice the full rescan
into 250-room chunks. **The marked-unread state is therefore kept in its own atom and never
written into `roomToUnreadAtom`.** Reasons:

- `roomToUnreadAtom` carries `{total, highlight}` counts and propagates them up the space tree;
  a marked-unread room has _no_ counts, so it does not belong in that map.
- The marked-unread set changes only on an explicit user action (or an account-data `/sync`
  update), i.e. a handful of times a session — nothing like the per-sync traffic the BULK
  batching exists to absorb. Keeping it separate means zero new work on the hot path.
- The initial scan over all joined rooms reuses the same `runChunked()` helper from
  `utils/batch.ts`, so it cannot become one long blocking task on an 8.7k-room account.

Room account data updates arrive as `RoomEvent.AccountData`, which **matrix-js-sdk re-emits on
the client** (`sync.js` `reEmitter.reEmit(room, [... RoomEvent.AccountData ...])`) — so one
client-level listener covers every room, the same pattern `roomToUnread.ts` already uses for
`RoomEvent.Receipt`.

**matrix-js-sdk 38.2.0 (the version pinned here) has no `EventType.MarkedUnread`** and no typed
`RoomAccountDataEvents` entry, so the event types are plain string constants.

### 1.6 Rendering decision (interacts with his own `hideUnreadActivityDots` setting)

His fork added `hideUnreadActivityDots` (commit `7b52625`), which makes `UnreadBadge` render
`null` for a dot-only indicator (`count <= 0 && !highlight`). A manually marked room is exactly
that shape — so reusing `UnreadBadge` would make the feature invisible for him, since he has that
setting on.

A **manual** mark is a deliberate user action, not the activity noise that setting exists to
suppress. So marked-unread gets its own indicator (`MarkedUnreadBadge`) that is never suppressed
by `hideUnreadActivityDots`, plus the usual bold room name / highlighted row. If real
notifications arrive for the room, the normal counted badge takes over (MSC2867's rule).

---

## 2. Pin messages

### 2.1 The spec

- **`m.room.pinned_events`** — room **state** event, `state_key` must be `""`.
  <https://spec.matrix.org/v1.16/client-server-api/#mroompinned_events>
  (schema `data/event-schemas/schema/m.room.pinned_events.yaml`).

```json
{
  "type": "m.room.pinned_events",
  "state_key": "",
  "content": { "pinned": ["$eventId1", "$eventId2"] }
}
```

- `content.pinned` is a **required, ordered** array of event IDs. The spec explicitly says the
  order is guaranteed and is the order supplied, and that _"clients are responsible for
  determining if a particular event in the pinned list is displayable"_ — pinned events may be
  invisible to you because of history visibility, may be redacted, or may simply not be in any
  loaded timeline.
- **Permission:** it is a state event, so the gate is the usual power-level check — an
  `events["m.room.pinned_events"]` entry in `m.room.power_levels` if present, else
  `state_default` (50 by default). There is no special rule.
- Because it is state, there is only ever **one** pinned list per room, shared by everyone —
  unpinning is a full rewrite of the array.

### 2.2 What the other clients do

- **Element Web** — pin/unpin in the message action bar + context menu (power-level gated), a
  **pinned-message banner at the top of the timeline** with a counter and prev/next, and a
  "Pinned messages" card in the right panel with jump-to-message and unpin.
- **Element X** — the same two surfaces (banner + list screen).
- **FluffyChat** — `Room.setPinnedEvents(List<String>)` writing the same state event.
- **upstream Cinny** — **has it, since PR #2081 "Pinned Messages" (commit `35f0e40`,
  2024-12-16, released in v4.2.0), plus `b84f975` "fix edits does not reflect in pinned
  messages".**

### 2.3 This fork already has upstream's pinned-messages feature

`35f0e40` is an ancestor of `dev` (verified: `git merge-base --is-ancestor 35f0e40 dev` ⇒ true),
so everything below is **already in his live app** and already uses the standard event:

| Piece                                                                                                                                           | File                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `m.room.pinned_events` state-event type                                                                                                         | `src/types/matrix/room.ts` (`StateEvent.RoomPinnedEvents`)                                            |
| read the pinned list                                                                                                                            | `src/app/hooks/useRoomPinnedEvents.ts` (reads `content.pinned`, `?? []`)                              |
| **Pin / Unpin** in a message's ⋮ menu, power-level gated                                                                                        | `src/app/features/room/message/Message.tsx` (`MessagePinItem`), rendered only when `canPinEvent`      |
| the permission check itself                                                                                                                     | `RoomTimeline.tsx` / `RoomPinMenu.tsx`: `permissions.stateEvent(StateEvent.RoomPinnedEvents, userId)` |
| Pin button + count badge in the room header                                                                                                     | `src/app/features/room/RoomViewHeader.tsx`                                                            |
| full **Pinned messages** panel: virtualised list, renders text/image/sticker/encrypted/redacted, "View" (jump to message) and "Unpin" per entry | `src/app/features/room/room-pin-menu/RoomPinMenu.tsx` (545 lines)                                     |

It fetches events that are not in the timeline (`useRoomEvent` → `mx.fetchRoomEvent` + decrypt +
apply edits), and it already renders pins created by _other_ clients, because it is the same
state event.

**Decision: do not reimplement any of that.** Backporting is moot — it is already merged. The one
surface Cinny lacks compared to Element Web / Element X is the **banner at the top of the
timeline**, which is the part he actually described ("a compact 📌 N pinned banner at the top of
the room with a dropdown/list, jump-to-message on tap"). That is the only pin work on this
branch.

### 2.4 The banner's design

- Renders only when the pinned list is non-empty; sits above the timeline inside `RoomView`.
- Shows the pin icon, the sender's display name, a one-line snippet of the pinned message, and
  `i/N` when there is more than one.
- Prev / next cycle through the pinned events (newest-pinned first, i.e. the end of the array,
  matching Element).
- Clicking the banner body jumps to the message (`navigateRoom(roomId, eventId)` — the same
  highlight-and-scroll path replies and permalinks already use). "View all" opens the existing
  `RoomPinMenu`, so there is exactly one pinned-list implementation.
- Reuses `useRoomEvent`, so an event that is not in the loaded timeline is fetched and decrypted;
  while loading it shows a placeholder, a redacted pin shows "Message deleted", and an
  unfetchable one shows "Message unavailable" instead of breaking the banner.
- Hideable: `Settings ▸ General ▸ Appearance ▸ "Show pinned message banner"`, default on, stored
  in the same `settings` localStorage blob as his other fork settings.

---

## 3. Fork vs upstream drift (asked for in the brief)

Measured 2026-10-13, `git rev-list --left-right --count dev...upstream/dev` ⇒ **22 / 61**.

- Merge base is **2026-05-03**; upstream `dev` is at **v4.12.7** (2026-09-16), the fork's
  `package.json` says **4.11.1**.
- The 22 fork-only commits are 14 real changes: the two read-receipt fixes, the service-worker
  media-auth fix, the three back-lag perf commits, Home-shows-all-rooms, message-search DM fix,
  in-app translation, local Whisper transcription, the emoji-board perf fix, the voice/media
  reply-render fix, and the activity-dot suppression setting.
- `chagai` is 4 commits off `dev` (23 behind / 4 ahead) and carries the "merge Direct into Home /
  remove the Direct tab" experiment that `dev` deliberately did not take.

**Recommendation: do NOT merge upstream as part of this work.** Neither feature needs it (pins
are already in; marked-unread does not exist upstream at any version), and the 61 upstream commits
land squarely on the room-list/unread code that the three perf commits rewrote — a merge there is
a separate, carefully-verified task with its own preview build, not a side effect of a feature
branch. An upstream catch-up is worth doing on its own branch later, mainly for the dependency
security bumps (`sanitize-html`, `react-router-dom`) in that range.

---

## 4. Interop summary (why a mark/pin made here is understood elsewhere)

- Marking a chat unread here writes **`m.marked_unread` `{"unread": true}`** room account data —
  the stable, spec-v1.12 key. Element Web, Element X / matrix-rust-sdk and FluffyChat all read
  exactly that key (stable first), so the chat shows as unread there too, and when any of them
  opens the chat it writes `unread: false` and the mark disappears here.
- A flag set by an older FluffyChat under `com.famedly.marked_unread` is read here as well.
- `m.fully_read` and read receipts are untouched, so nothing about the existing read state,
  notification counts or the WhatsApp bridge's read receipts changes.
- Pinning uses **`m.room.pinned_events`** room state — the same event Element and FluffyChat
  write, gated by the same power level — so pins are shared both ways, including into WhatsApp-
  bridged rooms (where they stay Matrix-side; WhatsApp has no pinned-message bridging).
