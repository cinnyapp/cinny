# dev consolidation — 2026-10-18

Everything that had been built on separate `claude/*` branches is now on `dev`,
plus three new things: a search field in Settings, the fix for the transcribe
button, and much faster video.

Rollback for the whole thing is one command:

```bash
git push origin dev-backup-2026-10-18:dev --force
```

(`dev-backup-2026-10-18` is a tag at the commit `dev` pointed to before this.)

## What was already on `dev` before today

| Branch                                  | What it does                                                     |
| --------------------------------------- | ---------------------------------------------------------------- |
| `claude/back-lag-fix`                   | room list does not re-sort the whole list when you open a chat   |
| `claude/emoji-slow-fix`                 | emoji board opens fast (virtualizer size estimates)              |
| `claude/fix-voice-reply-failed-to-load` | voice/media replies render instead of "Failed to load message"   |
| `claude/inapp-translation`              | Translate button under each message + Translation settings page  |
| `claude/local-transcription`            | 🎤 Transcribe button on voice messages + transcription settings  |
| `claude/read-receipt-and-media-fixes`   | service worker keeps its auth token across respawns (media 401s) |
| `claude/read-receipt-stuck-unread`      | clears a stuck unread badge                                      |
| `claude/search-dm-rooms-fix`            | message search includes DM / WhatsApp rooms                      |
| `claude/deploy-integration`             | transcription endpoint + token come from `config.json`           |

## What was merged in today

| Branch                                         | What it does                                                            | Default                                 |
| ---------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------- |
| `claude/fix-transcribe-focustrap`              | stops the transcript popover crashing the app                           | always on                               |
| `claude/cinny-unread-pin`                      | mark a chat unread (`m.marked_unread`) + pinned-message banner          | banner **on**, mark-unread is an action |
| `claude/cinny-speed`                           | `/sync` store restored in a web worker + restore progress on the splash | always on                               |
| `claude/cinny-lite`                            | do not load chats that have gone quiet                                  | **off**                                 |
| `claude/mark-irrelevant`                       | fold a message away (🙈 reaction), still readable via Show              | always available, hides-but-keeps       |
| `claude/ci-fail-loud-on-missing-netlify-creds` | the deploy workflow fails loudly instead of a fake green tick           | n/a                                     |

Only one merge conflict: `src/app/state/settings.ts`, where the pinned-banner
setting and the lite-mode settings were added to the same two blocks. Both
sides were kept.

## Deliberately NOT merged

- `chagai`, `hide-unread-activity-dots`, `claude/fix-unread-notification-dots-GQBZU`
  — superseded. `dev` already carries equivalent commits
  (`feat(notifications): suppress activity-only dot indicators` and
  `feat(home): show every chat in Home, including chats inside a space`), so
  merging them would only re-introduce an older implementation of the same two
  features.
- `claude/wa-start-chat`, `connect-bern-test`, `claude/create-testing-branch-kBznt`
  — these belong to the **Staying-in-Bern** deployment, not the personal app.
  They change `config.json`'s default homeserver and add a signature-settings
  page for that other site.
- `claude/dev-plus-transcribe-fix` — only a staging merge of
  `claude/fix-transcribe-focustrap`, which is merged directly.

## New: Settings search

A search field above the settings page list filters the whole catalogue —
every page, section, setting title and description — and highlights what
matched. Picking a result opens its page, scrolls to the setting and flashes
an outline around it. Arrow keys move through the results, Enter opens the
highlighted one, Escape clears the field.

The catalogue is generated from the JSX so it cannot silently rot:

```bash
npm run build:settings-index    # after adding a setting
npm run test:settings-search    # fails if the index is out of date
```

A synonym table in `settingsIndex.ts` maps what you would actually type
("dark mode", "slow", "blue ticks", "whisper") onto the right setting.

## Fixed: the transcribe button

Clicking 🎤 crashed the whole app:

```
Unexpected Application Error!
Your focus-trap must have at least one container with at least one
tabbable node in it at all times
```

The popover opens in its loading state — a heading, a spinner and one line of
text, none of them tabbable — and `focus-trap-react` refuses to activate on a
container with nothing to focus, so it threw before the transcript could ever
arrive. **The backend was healthy the whole time** (`/apptranscribe/healthz`
200, CORS correct for the Netlify origins, Whisper `large-v3-turbo` loaded).

Fix: an always-present Close button, plus the popover container itself made
focusable and handed to the trap as `fallbackFocus`.
`npm run test:transcribe-popover` locks the shape in.

## Faster video

Videos were downloaded in full into a blob before a single frame could play.
Unencrypted videos now play straight from the authenticated media URL (the
service worker attaches the token), with the server thumbnail as the poster
and `preload="metadata"`.

Measured on a 17 MB video at a paced 3 MB/s, 3 runs each:

|        | first frame | downloaded before playing |
| ------ | ----------- | ------------------------- |
| before | 5.52–5.55 s | 17,198,871 bytes          |
| after  | 0.06–0.08 s | 0 bytes                   |

If the streamed request fails (a first page load where the service worker is
not yet controlling the page), it falls back to the old path automatically —
worst case is exactly today's behaviour, measured at 5.53 s.

Encrypted videos still have to be downloaded and decrypted first, but now show
real progress, and the decrypted result is cached (2 entries / 200 MB) so
re-opening one is instant. The service worker now also forwards the `Range`
header, so seeking does not restart the download on a homeserver that supports
partial content.

No player library was added. hls.js / video.js / plyr do nothing for a plain
progressive download — the win is in not buffering the file first — and they
would cost 150–300 KB of bundle.

## Checks

```bash
npm ci
NODE_OPTIONS='--max_old_space_size=4096' npm run build   # exit 0
npm test                 # 50 unit tests across 4 suites
npx prettier --check .   # clean
```

Plus a headless-Chromium smoke test against a mocked homeserver (no real
account, no real room touched): 18/18 checks — pin banner, transcribe button,
no crash on open, Close button, translate control, mark-as-irrelevant,
mark-as-unread writing `{"unread": true}`, settings search, lite mode off by
default, Escape clearing the field.
