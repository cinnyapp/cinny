# Chagai's Cinny fork — features that must survive every upstream merge

Fork: `chagai95/cinny`, live branch `dev` (self-hosted at https://chagai.website/cinny-dev/, Netlify
`dev--cinny-chagai.netlify.app`). Upstream: `cinnyapp/cinny` (tags `vX.Y.Z`).
Last upstream merge: **v4.12.7** (2026-10-20, branch `upstream-merge/v4.12.x`).

The weekly `~/matrix-os/bin/upstream-sync.py` reads this file. After any upstream merge, run the
**Gate** below; every row in the feature table must still pass its check.

## Gate (run in this order; all must pass)

```gate
npm ci
NODE_OPTIONS=--max_old_space_size=4096 npm run build
npm test
python3 ~/cinny-consolidated-lab/smoke.py <out>                      # serve dist on :4173
python3 ~/cinny-chat-list-lab/smoke_regression.py <out>              # serve dist on :4292
python3 ~/cinny-chat-list-lab/chatlist_check.py http://127.0.0.1:<port> <out>
python3 ~/cinny-consolidated-lab/media_viewer_smoke.py <out> http://127.0.0.1:4191
python3 ~/cinny-consolidated-lab/smoke_dm_avatars.py http://127.0.0.1:<port> <out> <label>
python3 ~/cinny-consolidated-lab/transcribe_reuse_smoke.py http://127.0.0.1:<port> <out>
python3 ~/cinny-consolidated-lab/video_bench.py http://127.0.0.1:<port> <label>   # needs media_server.py sample.webm 4299
python3 ~/cinny-consolidated-lab/worker_check.py http://127.0.0.1:<port>             # /sync store runs in the worker
python3 ~/cinny-consolidated-lab/smoke_cinny_dev.py http://127.0.0.1:<port>/cinny-dev/ <out> --real-login   # hash-router subpath build
```

Serve a built `dist/` with SPA fallback: `python3 ~/cinny-chat-list-lab/spa_server.py dist <port>`.
All browser smokes use a **fully mocked homeserver** (nothing real is touched); `--real-login`
only loads the real login page.

## Features

| #   | Feature                                                                                                                                        | Key files (ours)                                                                                                    | How to verify                                                                                                                                                       |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Error boundaries: a crash in one popup / message / room / settings page shows a small box with Retry instead of killing the app                | `components/error-boundary/*`, `components/focus-trap/SafeFocusTrap.tsx`                                            | `npm run test:error-boundaries` (also enforces: **no file imports `focus-trap-react` directly** — new upstream FocusTrap users must import `components/focus-trap`) |
| 2   | Transcribe button (🎤 local Whisper) + hover popup + language select; popover can never crash (always-present Close)                           | `features/transcription/*`, `RenderMessageContent.tsx`, `AudioContent.tsx`                                          | `npm run test:transcribe-popover`; smoke.py "transcribe …" checks                                                                                                   |
| 3   | Transcript reuse: shows the server daemon's automatic transcript instantly, polls for the better one                                           | `features/transcription/*`                                                                                          | `npm run test:transcript-flow`; `transcribe_reuse_smoke.py`                                                                                                         |
| 4   | Transcription in encrypted rooms (sends the attachment key)                                                                                    | `features/transcription/*`                                                                                          | test:transcript-flow; manual on an encrypted voice note                                                                                                             |
| 5   | Transcription/translation endpoints from `config.json` (`transcription`, `translation` keys) with per-user Settings override                   | `hooks/useClientConfig.ts`, `config.json`                                                                           | build + smoke.py translate/transcribe checks (mocked endpoints)                                                                                                     |
| 6   | In-app translation (offline Libre backend) + Translation settings page                                                                         | `features/translation/*`, `features/settings/translation/*`                                                         | smoke.py "translate control is on messages"                                                                                                                         |
| 7   | Mark as irrelevant (🙈 folds a message, nothing deleted)                                                                                       | `features/irrelevant/*`, `room/message/Message.tsx`                                                                 | smoke.py "Mark as irrelevant" + "marking folds the message"                                                                                                         |
| 8   | Mark as unread (MSC2867 `m.marked_unread`), cleared when the room is opened                                                                    | `state/room/markedUnread.ts`, `utils/markedUnread.ts`, `room/Room.tsx` (effect)                                     | smoke.py "Mark as Unread" + "writes m.marked_unread"; `node scripts/check-unread-and-pins.mjs`                                                                      |
| 9   | Pinned-message banner above the timeline (`showPinnedBanner`, default on)                                                                      | `room/room-pin-banner/*`                                                                                            | smoke.py "pinned banner above the timeline"                                                                                                                         |
| 10  | Settings search (fuzzy, synonyms, jump + flash) — index generated from the JSX                                                                 | `settings/search/*`, `scripts/build-settings-index.mjs`, `settings/pages.ts`                                        | `npm run test:settings-search` (fails if a setting is not indexed → rerun `npm run build:settings-index`)                                                           |
| 11  | /sync store runs in a **web worker** (no UI freeze on 9k rooms) with main-thread fallback                                                      | `src/client/initMatrix.ts`, `src/client/indexeddb-worker.ts`, `vite.config.js` (`worker.format: 'es'`)              | build must emit `assets/indexeddb-worker-*.js`; `worker_check.py` (page spawns that worker, no "falling back to main thread")                                       |
| 12  | Splash shows "N chats restored" progress                                                                                                       | `pages/client/ClientRoot.tsx`                                                                                       | manual / smoke loads                                                                                                                                                |
| 13  | Lite mode (don't load chats that went quiet; off by default; 90-day window)                                                                    | `src/client/lite-*.ts`                                                                                              | `npm run test:lite`; smoke.py "Lite mode is OFF by default"                                                                                                         |
| 14  | Chat list v2: order by last _real_ message, muted chats stay put/faded, filter chips per network, name filter, sort menu, Settings ▸ Chat List | `features/chat-list/*`, `utils/chatList.ts`, `utils/roomActivity.ts`, `state/room/roomActivity.ts`, `utils/sort.ts` | `npm run test:chat-list`; `chatlist_check.py` (24 checks)                                                                                                           |
| 15  | Back-lag fix: list doesn't re-sort when another room opens; batched unread updates; space list not rebuilt per unread                          | `state/room/roomToUnread.ts`, `hooks/useSpaceHierarchy.ts`, `utils/batch.ts`                                        | `smoke_regression.py`; manual feel on 9k rooms                                                                                                                      |
| 16  | Home shows every chat incl. chats inside spaces; Direct merged into Home                                                                       | `pages/client/home/Home.tsx`, `sidebar/HomeTab.tsx`, `direct/Direct.tsx`                                            | chatlist_check "Home default order"                                                                                                                                 |
| 17  | Hide activity-only unread dots (`hideActivity`)                                                                                                | `utils/notifications.ts`, `unread-badge/UnreadBadge.tsx`                                                            | manual: setting in General                                                                                                                                          |
| 18  | Stuck unread badge cleared when the receipt is pinned far behind; synthesized receipts ignored                                                 | `utils/notifications.ts`, `utils/room.ts`                                                                           | manual                                                                                                                                                              |
| 19  | Message search includes DM/WhatsApp rooms                                                                                                      | `features/message-search/*`                                                                                         | manual search                                                                                                                                                       |
| 20  | Fast emoji board (virtualizer size estimates)                                                                                                  | `emoji-board/EmojiBoard.tsx`                                                                                        | manual: emoji picker opens instantly (smoke_cinny_dev "emoji picker")                                                                                               |
| 21  | Voice/media replies render (no "Failed to load message")                                                                                       | `components/message/Reply.tsx`                                                                                      | manual                                                                                                                                                              |
| 22  | Service worker keeps the media auth token across respawns; forwards `Range`                                                                    | `src/sw.ts`, `src/sw-session.ts`, `utils/mediaAuth.ts`                                                              | smoke_cinny_dev `--real-login` "service worker registered + active"; video_bench                                                                                    |
| 23  | Pictures don't fail after a hard reload (fallback without SW, quiet console)                                                                   | `utils/mediaAuth.ts`, `ImageContent.tsx`, `ThumbnailContent.tsx`                                                    | `npm run test:media-errors`                                                                                                                                         |
| 24  | Video plays on the first bytes (stream, poster, LRU cache for encrypted)                                                                       | `VideoContent.tsx`, `mediaCache.ts`                                                                                 | `npm run test:media-cache`; `video_bench.py` → first_frame_s < 0.5, blob_bytes 0                                                                                    |
| 25  | Media viewer: swipe through every picture of a chat; profile-picture history                                                                   | `features/media-viewer/*`, `features/profile-avatar-history/*`, `RoomViewHeader.tsx`                                | `npm run test:media-gallery`; `media_viewer_smoke.py` (42 checks)                                                                                                   |
| 26  | 1:1 chat pictures = the person's live picture (bridged WhatsApp DMs)                                                                           | `utils/dmAvatar.ts`, `RoomNavItem.tsx`, `RoomViewHeader.tsx`, `room-avatar/RoomAvatar.tsx`                          | `npm run test:dm-avatar`; `smoke_dm_avatars.py` (molly=new, anouk=blue, eli=purple, masked=placeholder, dad=orange)                                                 |
| 27  | Sender avatars (in progress on `claude/cinny-sender-avatars` 2026-10-20)                                                                       | `user-avatar/UserAvatar.tsx`, `member-tile/*` …                                                                     | its own test once merged                                                                                                                                            |
| 28  | Hash-router subpath build for https://chagai.website/cinny-dev/                                                                                | `~/matrix-os/bin/cinny-dev-publish.sh` (outside repo)                                                               | `smoke_cinny_dev.py` (26 checks with `--real-login`)                                                                                                                |
| 29  | CI fails loudly when Netlify creds are missing                                                                                                 | `.github/workflows/netlify-dev.yml`                                                                                 | read the workflow after a merge (upstream bumps action pins here)                                                                                                   |
| 30  | a11y labels used by our tests (`aria-label="User Settings"`, unread dot, header options)                                                       | `sidebar/SettingsTab.tsx`, room header                                                                              | smoke.py opens Settings by that label                                                                                                                               |

## Conflict-minimising guidance (where our code should live)

- **New behaviour goes in new files/dirs** (`src/app/features/<feature>/`, `src/app/utils/<thing>.ts`,
  `src/client/<thing>.ts`); the upstream file gets a **one-line hook** (an import + one JSX element or
  one call), never a rewrite. Most of our 91 new files already follow this.
- **Settings keys:** append ours in a single block at the end of `state/settings.ts` (both the type and
  the defaults), with a `// chagai:` comment — the only consolidation conflict ever was two features
  appending to the same spot.
- **Config over code:** endpoints/tokens/defaults in `config.json` (+ `useClientConfig.ts` types),
  never hard-coded.
- **package.json:** our scripts are all `test:*` / `build:settings-index`; keep them grouped after
  upstream's scripts so upstream edits to its own lines don't touch ours. Never hand-merge
  `package-lock.json` — take upstream's, then `npm install --package-lock-only --ignore-scripts`.
- **Wrap, don't fork, upstream components:** e.g. `SafeFocusTrap` re-exported as the default of
  `components/focus-trap`, `SafeBoundary` around upstream views.
- Mark every edit inside an upstream file with `// chagai:` so a conflict reviewer sees which side is ours.

## Hot spots — upstream files we edited (watch these in every merge)

Edited by both us and upstream in v4.11→v4.12 (actually conflicted: ⚠):
`package.json` ⚠, `package-lock.json` ⚠, `room/Room.tsx` ⚠, `room/RoomViewHeader.tsx` ⚠,
`room-nav/RoomNavItem.tsx` ⚠, `room/RoomTimeline.tsx`, `hooks/useCall.ts`, `config.json`,
`.github/workflows/netlify-dev.yml`, `call-status/LiveChip.tsx`, `call/CallControls.tsx`,
`user-profile/UserChips.tsx`.
Upstream added a new `focus-trap-react` import (`components/CallEmbedProvider.tsx`) → rerouted.

Our biggest edits to upstream files (lines added+removed), most likely to conflict next time:

- `src/app/state/room/roomToUnread.ts` (168+34)
- `src/sw.ts` (145+16)
- `src/app/components/message/content/VideoContent.tsx` (140+23)
- `src/client/initMatrix.ts` (132+10)
- `src/app/features/settings/Settings.tsx` (102+49)
- `src/app/features/room/RoomViewHeader.tsx` (83+9)
- `src/app/components/message/content/ImageContent.tsx` (67+10)
- `src/app/utils/matrix.ts` (64+4)
- `src/app/state/settings.ts` (64+0)
- `src/app/pages/client/home/Home.tsx` (61+25)
- `src/app/hooks/useSpaceHierarchy.ts` (58+36)
- `src/app/features/room/RoomTimeline.tsx` (54+8)
- `src/app/components/message/Reply.tsx` (52+8)
- `src/app/features/settings/general/General.tsx` (52+1)
- `src/app/features/room/message/Message.tsx` (52+14)
- `src/app/features/room-nav/RoomNavItem.tsx` (46+8)
- `src/app/hooks/useRoomMeta.ts` (37+3)
- `src/app/pages/client/ClientRoot.tsx` (36+3)
- `src/app/components/emoji-board/EmojiBoard.tsx` (36+3)
- `src/app/utils/notifications.ts` (34+2)
- `src/sw-session.ts` (33+5)
- `src/app/components/unread-badge/UnreadBadge.tsx` (32+0)
- `src/app/features/room/Room.tsx` (31+7)
- `src/app/pages/client/direct/Direct.tsx` (29+24)
- `src/app/hooks/useClientConfig.ts` (28+0)
- `src/app/state/hooks/roomList.ts` (27+3)
- `src/app/utils/room.ts` (25+15)
- `src/app/components/RenderMessageContent.tsx` (22+1)
- `src/app/components/message/content/AudioContent.tsx` (19+3)
- `src/index.tsx` (18+2)

(120 upstream files edited in total; regenerate with
`git diff --numstat $(git merge-base dev upstream/dev) dev` filtered to files that exist upstream.)
