#!/usr/bin/env node
/**
 * Regenerate src/app/features/settings/search/settingsIndex.generated.ts
 *
 * The Settings pages are hand-written JSX, not a declarative config, so the
 * search field needs a catalogue of "which setting lives on which page".
 * Rather than hand-maintaining that list (which would silently rot the first
 * time somebody adds a setting), this script reads the JSX of every settings
 * page and extracts every <SettingTile title="…" description="…" /> plus the
 * section heading (<Text size="L400">…</Text>) it sits under.
 *
 *   node scripts/build-settings-index.mjs           # rewrite the generated file
 *   node scripts/build-settings-index.mjs --check   # fail if it is out of date
 *
 * scripts/test-settings-search.mjs runs the --check form, so a new setting
 * that was never indexed makes the test suite fail instead of just quietly
 * being unsearchable.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const prettier = require('prettier');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'src/app/features/settings/search/settingsIndex.generated.ts');

/** page enum member -> human name + the source files that render it */
const PAGES = [
  [
    'GeneralPage',
    'General',
    ['src/app/features/settings/general', 'src/app/features/transcription'],
  ],
  ['AccountPage', 'Account', ['src/app/features/settings/account']],
  ['NotificationPage', 'Notifications', ['src/app/features/settings/notifications']],
  ['DevicesPage', 'Devices', ['src/app/features/settings/devices']],
  ['EmojisStickersPage', 'Emojis & Stickers', ['src/app/features/settings/emojis-stickers']],
  ['TranslationPage', 'Translation', ['src/app/features/settings/translation']],
  ['DeveloperToolsPage', 'Developer Tools', ['src/app/features/settings/developer-tools']],
  ['AboutPage', 'About', ['src/app/features/settings/about']],
];

const listFiles = (rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) return [];
  if (fs.statSync(abs).isFile()) return [abs];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.tsx'))
    .sort()
    .map((f) => path.join(abs, f));
};

const HEADING_RE = /<Text[^>]*size="L400"[^>]*>([^<{}]+)<\/Text>/;
// Matches a <SettingTile …> opening tag (possibly spanning several lines).
const TILE_RE = /<SettingTile\b([\s\S]*?)(\/>|>)/g;
const ATTR_RE = (name) => new RegExp(`${name}="([^"]+)"`);

/** Empty-state / placeholder tiles that are not really settings. */
const SKIP_TITLES = new Set(['Translation backend not configured']);

const collect = () => {
  const entries = [];
  const seen = new Set();

  PAGES.forEach(([page, pageName, dirs]) => {
    dirs.flatMap(listFiles).forEach((file) => {
      const src = fs.readFileSync(file, 'utf8');
      const lines = src.split('\n');

      // Only treat the shallowest L400 headings in a file as page sections —
      // deeper ones live inside dialogs/pop-outs and are not navigation labels.
      const headings = [];
      lines.forEach((line, i) => {
        const m = line.match(HEADING_RE);
        if (m) headings.push({ line: i, indent: line.search(/\S/), text: m[1].trim() });
      });
      const minIndent = headings.reduce((a, h) => Math.min(a, h.indent), Infinity);
      const sections = headings.filter((h) => h.indent === minIndent);

      const sectionAt = (charIndex) => {
        const line = src.slice(0, charIndex).split('\n').length - 1;
        let label;
        sections.forEach((h) => {
          if (h.line <= line) label = h.text;
        });
        return label;
      };

      let m;
      TILE_RE.lastIndex = 0;
      // eslint-disable-next-line no-cond-assign
      while ((m = TILE_RE.exec(src)) !== null) {
        const attrs = m[1];
        const title = attrs.match(ATTR_RE('title'))?.[1]?.replace(/:$/, '').trim();
        if (!title) continue; // dynamic title (a device name, a keyword …)
        if (SKIP_TITLES.has(title)) continue;
        const description = attrs.match(ATTR_RE('description'))?.[1];
        const section = sectionAt(m.index);
        const key = `${page}::${title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push({
          page,
          pageName,
          section,
          title,
          description,
          file: path.relative(ROOT, file),
        });
      }
    });
  });

  return entries;
};

const render = (entries) => {
  const body = entries
    .map((e) => {
      const parts = [
        `    page: SettingsPages.${e.page},`,
        `    pageName: ${JSON.stringify(e.pageName)},`,
      ];
      if (e.section) parts.push(`    section: ${JSON.stringify(e.section)},`);
      parts.push(`    title: ${JSON.stringify(e.title)},`);
      if (e.description) parts.push(`    description: ${JSON.stringify(e.description)},`);
      return `  {\n${parts.join('\n')}\n  },`;
    })
    .join('\n');

  return `/* eslint-disable */
/**
 * GENERATED FILE — do not edit by hand.
 * Run \`node scripts/build-settings-index.mjs\` after adding a setting.
 *
 * ${entries.length} settings indexed for the Settings search field.
 */
import { SettingsPages } from '../pages';
import type { SettingsIndexEntry } from './settingsIndex';

export const GENERATED_SETTINGS_INDEX: SettingsIndexEntry[] = [
${body}
];
`;
};

const entries = collect();
// Format with the repo's prettier config so `npm run lint` stays happy and
// `--check` compares like with like.
const next = prettier.format(render(entries), {
  ...prettier.resolveConfig.sync(OUT),
  parser: 'typescript',
});
const check = process.argv.includes('--check');

if (check) {
  const current = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (current !== next) {
    console.error('settings index is out of date — run: node scripts/build-settings-index.mjs');
    process.exit(1);
  }
  console.log(`settings index up to date (${entries.length} entries)`);
} else {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, next);
  console.log(`wrote ${path.relative(ROOT, OUT)} (${entries.length} entries)`);
}
