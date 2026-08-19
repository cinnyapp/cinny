# Cinny Threads Fork

A fork of [Cinny](https://github.com/cinnyapp/cinny) v4.12.6 that adds a
**Discord-style thread side-panel** — the feature Cinny doesn't have.

Cinny is a beautiful, Discord-style Matrix client, but it renders threads inline in
the room timeline with no dedicated thread panel. This fork adds a proper thread
drawer docked to the right of the room view, modeled on Cinny's existing member
drawer, plus Element-style thread summaries on root messages in the main timeline.

> **Upstream status:** Cinny is [not accepting pull requests](https://github.com/cinnyapp/cinny/issues/257)
> while they replace the matrix-js-sdk with their own SDK. This fork is pinned to
> v4.12.6 and maintained independently until upstream reopens. A PR has been opened
> upstream for visibility — see the link in the PR section below.

## Features

### Thread side-panel drawer (`ThreadsDrawer`)
- **Thread list** — every thread in the room, with root message preview, reply count,
  and a white unread-count pill. One-line rows, no sender prefix.
- **Thread detail view** — renders the full thread conversation inside the drawer,
  reusing Cinny's existing message renderers (so it looks identical to the main
  timeline). Supports `m.room.message`, `m.room.encrypted` (with decrypt/retry
  states), and `m.sticker` events, plus edited messages (`m.new_content`).
- **Thread reply composer** — reply directly from the drawer with `@mention`
  autocomplete pills, emoji/sticker pickers, and auto-expand. Sends
  `m.relates_to { rel_type: 'm.thread', event_id }` relations correctly.
- **Resizable** — drag the left edge to resize (min 320px, max 640px, default 400px);
  width persists to `localStorage`.
- **Overflow menu** — vertical-dots menu (mirroring Cinny's room menu) with
  **Mark as Read** (sends a threaded read receipt), **View in Thread** (focuses the
  root message in the main timeline), and **Copy Link**.
- **Auto-mark-read** — opening a thread detail sends a threaded read receipt, clearing
  the unread pill and the main-timeline summary indicator.
- **Live updates** — new threads and new replies appear live without a reload;
  the detail view auto-scrolls to new replies.
- **Desktop only** — collapses on mobile, same as the member drawer. Toggled via
  a threads `IconButton` in the room header (mutually exclusive with the member drawer).

### Element-style thread summaries (`ThreadSummary`)
- Thread root messages in the main timeline show a clickable summary row beneath them
  (thread icon + last-reply preview + reply count) when they have replies.
- When the thread has unread replies, the icon swaps to an accent thread-unread icon
  and a white unread-count pill appears.
- Clicking the summary opens the thread in the drawer.

### Real unread message counts in channel badges
- The left-side channel list badge now shows the **actual number of unread messages**
  (walking the live timeline from the read receipt to the end), not the SDK push-rule
  notification count which returns 0 for "Mentions & Keywords only" rooms. Matches
  Element behavior.

### Adaptive authenticated media (`useMediaAuthentication`)
- Cinny v4.12.6 generates authenticated v1 media URLs when the server advertises
  spec v1.11, but the service worker that injects the Bearer token only works in
  secure contexts (HTTPS / localhost). On plain HTTP LAN IPs the SW can't register,
  so media 401s and avatars never load.
- This fork gates `useMediaAuthentication` on `window.isSecureContext` so
  authenticated v1 URLs are only generated when the SW can actually register, falling
  back to unauthenticated v3 media URLs over plain HTTP. Works for both
  `https://chat.example.com` and `http://10.0.0.5:8083` access patterns.

### Build fix: crypto WASM glue
- The matrix-js-sdk crypto WASM chunk references `matrix_sdk_crypto_wasm_bg.js` at
  module load time, but `@rollup/plugin-wasm` only emits the `.wasm` file. This fork
  adds the glue JS to `viteStaticCopy` targets so it lands in `dist/assets/` and the
  crypto SDK loads instead of crashing with "Failed to fetch dynamically imported
  module" on routes that lazy-load it (e.g. post-SSO).

## Settings

A new **Threads** toggle appears in *Settings → General*:
"Show a threads side panel for the open room (desktop)". Off by default.

## Building

```bash
npm ci
npm run build
# dist/ contains the built SPA
```

Requires Node 18+ (tested on Node 26). The build is pure Vite (esbuild strips types;
no `tsc` gate). Deploy `dist/` to any static host behind a reverse proxy that routes
`/_matrix/*` to your Synapse.

## Branch structure

| Branch | Description |
|--------|-------------|
| `baseline-v4.12.6` | Clean upstream v4.12.6 (commit `33f4ba3`) — the pin point |
| `feature/threads-panel` | All thread-panel + fix commits on top of the baseline |

Rebasing to a future Cinny release: create a fresh `baseline-vX.Y` from upstream,
then `git rebase --onto baseline-vX.Y baseline-v4.12.6 feature/threads-panel`.

## Commits

25 commits on top of v4.12.6. See `docs/thread-panel-rfc.md` for the original
implementation RFC and design notes.

## Acknowledgements

All credit for the Cinny client and its design goes to the
[cinnyapp/cinny](https://github.com/cinnyapp/cinny) team. This fork exists only because
upstream is temporarily closed to contributions during their SDK rewrite, and a
thread panel was needed in the meantime.

## License

[AGPL-3.0](./LICENSE) — same as upstream Cinny.