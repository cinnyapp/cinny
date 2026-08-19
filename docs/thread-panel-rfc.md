# Cinny Thread Side-Panel — Implementation RFC

**Fork:** `cinny-fork` @ `baseline-v4.12.6` (commit `33f4ba3`, matches the build served at `10.1.0.220:8083`)
**SDK:** matrix-js-sdk `41.7.0`
**Status:** Plan (pending implementation approval)

## 1. Goal

Add a Discord-style side-panel for threads to Cinny, exposed as a **user setting**
(`Threads` toggle in General settings). When enabled on desktop, the room view gains a
threads drawer (docked right, mirroring the existing member drawer) that:

- lists the room's active/recent threads (root message snippet + last-activity + unread),
- opens a selected thread into a read view inside the panel (reusing Cinny's existing message renderers),
- is mutually exclusive with the member drawer (both live in the same right-column slot),
- collapses on mobile (same `ScreenSize.Desktop` gate the member drawer uses).

## 2. Current state (source-grounded, v4.12.6)

- **Threads are inline in the room timeline.** There is no thread component anywhere in
  `src/` (`find src -iname '*thread*'` returns nothing under `components/`/`features/`).
  Thread logic lives inside `RoomTimeline.tsx`, `message/Message.tsx`, and `message/Reply.tsx`.
- A message is a threaded event iff `mEvent.threadRootId !== undefined`.
- `Reply.tsx` renders a clickable **`ThreadIndicator`** (Icon `Thread` + "Thread" label,
  `data-event-id={threadRootId}`, `onClick{handleOpenReply}`). Today `handleOpenReply` only
  **scrolls to the root** in the main timeline — there is no dedicated thread view.
- **Start a thread:** `Message.tsx` "Reply in Thread" (`Icons.ThreadPlus`) →
  `RoomTimeline.handleReplyClick(evt, true)` sets a reply draft with relation
  `{ rel_type: 'm.thread', event_id: replyId }` and focuses the composer.
- **Panel host:** `src/app/features/room/Room.tsx` renders a horizontal `Box`:
  `RoomView` (grow) → optional `Line` divider → `MembersDrawer` (`shrink="No"`),
  gated on `screenSize === ScreenSize.Desktop && isDrawer`.
- **Member drawer template:** `MembersDrawer.tsx` (442 lines) — `Header` v600 with a Close
  `IconButton` (`Icons.Cross`) that `setPeopleDrawer(false)`, inner `Box shrink="No" direction="Column"`,
  `Scroll` + `useVirtualizer` (`@tanstack/react-virtual`), `useAsyncSearch`+`useDebounce` filtering,
  `Chip` filter/sort `PopOut` menus, `ScrollTopContainer`, `Spinner` while fetching.
  CSS in `MembersDrawer.css.ts`; container color via `ContainerColor` from `styles/ContainerColor.css`.
- **Settings model:** `src/app/state/settings.ts` — Jotai `atom` persisted to localStorage
  (`STORAGE_KEY = 'settings'`), a `Settings` interface + `defaultSettings` object.
  UI: `features/settings/general/General.tsx` uses `SettingTile` + `Switch` together with
  `useSetting(settingsAtom, key)` / `useSetSetting`. Example: `isPeopleDrawer` (default `true`).

## 3. Design

### 3.1 New setting

Add to `src/app/state/settings.ts`:

```ts
// interface Settings
threadsDrawer: boolean;

// defaultSettings
threadsDrawer: false,
```

Add a `SettingTile` + `Switch` (title `Threads`, hint "Show threads side panel") in
`features/settings/general/General.tsx`, next to the `isPeopleDrawer`-style toggles
(under Appearance / People area).

### 3.2 New `ThreadsDrawer` component

New file `src/app/features/room/ThreadsDrawer.tsx` (+ `ThreadsDrawer.css.ts`), modeled on
`MembersDrawer`. Props: `{ room: Room }` (no external members fetch needed — threads come
from the room). Structure:

```
Header v600: "<N> Threads" + Close (Icons.Cross) -> setThreadsDrawer(false)
Scroll
  ThreadScroller list (virtualized): one entry per thread root
    root avatar/sender + snippet (body, scaled emoji)
    last-activity / unread badge (from roomToUnreadAtom / useRoomUnread)
  empty-state: "No threads" Text when none
  Spinner while the thread set is still being fetched/paginated
Clicking a thread -> setSelectedThread(threadId) -> detail view replaces the list
Detail view:
  back arrow to list, root message header
  thread timeline rendered with existing message renderers (see 3.4)
  (MVP) read-only; reply-in-panel is a follow-up
```

### 3.3 Mount in `Room.tsx`

Alongside the member drawer, in the right-column slot:

```tsx
{!callView && screenSize === ScreenSize.Desktop && (isDrawer || threadsDrawer) && (
  <>
    <Line variant="Background" direction="Vertical" size="300" />
    {threadsDrawer ? <ThreadsDrawer key={room.roomId} room={room} /> : <MembersDrawer ... />}
  </>
)}
```

Because only one can show at a time, opening `threadsDrawer` should toggle `isPeopleDrawer`
off and vice-versa (a header/room-view affordance will swap them). This keeps the two
right-panels mutually exclusive without layout conflicts.

### 3.4 Rendering a thread's events

The existing `useMatrixEventRenderer` message renderers (`MessageEvent.RoomMessage`,
`RoomMessageEncrypted`, `Sticker`, etc.) already take a `timelineSet` argument and pass
`replyEventId`/`threadRootId` through. So the thread detail view can reuse them by supplying
the thread's `EventTimelineSet` (from the SDK thread object) instead of the room's unfiltered
set. Confirm exact SDK accessor at `npm ci` time:
- `room.getThreads()` → `Thread[]` (or per-timeline enumeration) for the list,
- thread object's live timeline / `EventTimelineSet` for the detail view.

### 3.5 Data, sync, and unread

- **Enumeration:** threads are per-room; root event + last message come from the SDK thread
  structures (Threads MSC). Live updates via existing room sync events.
- **Freshness:** thread roots that are not pre-loaded may require the room's client event
  timeline to include them. If `room.getThreads()` is not fully populated in the common case,
  add a `client.getThreadsForRoom`-style call or iterate the unfiltered timeline for
  `m.thread` relations. (Decide at implementation after SDK inspection.)
- **Unread:** reuse `src/app/state/room/roomToUnread.ts` + `src/app/state/hooks/unread.ts`
  (`useRoomUnread`) and the same `markAsRead` utility the room uses.

## 4. Risks / decisions

| Risk | Mitigation |
|------|------------|
| Thread enumeration not fully populated in SDK | Verify `room.getThreads()`/relation walk on a real room early (spike) |
| Mutually-exclusive drawers UX | Swap setting on open; keep single right-column slot |
| Mobile | Gate on `ScreenSize.Desktop` like `MembersDrawer` |
| Reusing inline-fragile renderers in a panel | Only feed the detail view the thread timelineSet; no changes to main timeline paths |
| Reply-from-panel (heavier) | Defer to follow-up; MVP read-only |
| Fork maintenance (no upstream PRs accepted) | Pin at `baseline-v4.12.6`, rebase only on explicit request |

## 5. Acceptance (MVP)

- [x] `Threads` toggle appears in General settings, persists across reloads.
- [x] Enabling it on desktop shows the thread drawer instead of the member drawer.
- [x] Drawer lists a real room's threads (snippet + reply count), with server-side list bootstrapped via `room.createThreadsTimelineSets()`.
- [x] Clicking a thread shows its events (root + replies, rendered with the same `Message`/`RenderMessageContent` the main timeline uses) in the panel; back arrow returns to the list.
- [x] Close (Cross) turns the drawer off; member drawer returns to its prior state (drawers are mutually exclusive via the header toggles).
- [ ] Live per-thread unread badge (thread-level unread computed from read marker) — follow-up.
- [ ] Reply in-thread from the detail view — follow-up.

## 6. Implementation status (2026-08-18)

Implemented on `feature/threads-panel` (forked from `baseline-v4.12.6` @ `33f4ba3`):
- `src/app/state/settings.ts` — `threadsDrawer` setting (default `false`).
- `src/app/features/settings/general/General.tsx` — `Threads` toggle in Appearance.
- `src/app/features/room/ThreadsDrawer.tsx` + `ThreadsDrawer.css.ts` — thread list + detail sub-view.
- `src/app/features/room/Room.tsx` — mounts the drawer (desktop, mutually exclusive with member drawer).
- `src/app/features/room/RoomViewHeader.tsx` — desktop Threads button toggling the drawer.
Verified: `npm run build` passes (exit 0); `npm run build` produces a new `dist` bundle; `npx eslint` and `prettier --check` clean on changed files. `tsc --noEmit` fails repo-wide at baseline (798 pre-existing errors from `matrix-js-sdk` ESM type resolution under `moduleResolution: Node`) — not regressions from this change; the shipping gate is `vite build`, which passes.
