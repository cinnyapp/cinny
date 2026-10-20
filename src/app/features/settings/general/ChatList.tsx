import React from 'react';
import { Box, Chip, Switch, Text } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { SequenceCardStyle } from '../styles.css';
import type { ChatSort, MutedMode } from '../../../utils/chatList';

const SORT_OPTIONS: [ChatSort, string][] = [
  ['activity', 'Last message'],
  ['unread', 'Unread first'],
  ['name', 'Name (A–Z)'],
];

const MUTED_OPTIONS: [MutedMode, string][] = [
  ['stay', 'Stay put'],
  ['bottom', 'At the bottom'],
  ['hide', 'Hidden from All'],
  ['normal', 'Like any other chat'],
];

function ChoiceChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: [T, string][];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <Box gap="200" wrap="Wrap">
      {options.map(([option, label]) => (
        <Chip
          key={option}
          variant={value === option ? 'Primary' : 'Secondary'}
          fill="Soft"
          outlined={value === option}
          radii="Pill"
          aria-pressed={value === option}
          onClick={() => onChange(option)}
        >
          <Text size="B300">{label}</Text>
        </Chip>
      ))}
    </Box>
  );
}

export function ChatListSettings() {
  const [sort, setSort] = useSetting(settingsAtom, 'chatListSort');
  const [mutedMode, setMutedMode] = useSetting(settingsAtom, 'chatListMuted');
  const [showFilters, setShowFilters] = useSetting(settingsAtom, 'chatListShowFilters');
  const [serverLookup, setServerLookup] = useSetting(settingsAtom, 'chatListServerLookup');

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Chat List</Text>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Sort chats by"
          description="Last message puts the chat with the newest real message on top — a text, photo, voice note, call or poll, including your own. Profile-picture and name changes, people joining, reactions and edits never move a chat."
        >
          <ChoiceChips options={SORT_OPTIONS} value={sort} onChange={setSort} />
        </SettingTile>
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Muted & archived chats"
          description="Stay put: a muted or archived chat only moves up when you write in it or someone mentions you, and is shown faded. At the bottom: always below every other chat. Hidden from All: only under the Muted filter and in name search."
        >
          <ChoiceChips options={MUTED_OPTIONS} value={mutedMode} onChange={setMutedMode} />
        </SettingTile>
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Show Chat Filters"
          description="The bar above Home and Direct Messages with a name filter, the sort menu and one-tap filters: All, Unread, People, Groups, Mentions, Favourites, Muted & archived and one per network (WhatsApp, Telegram, Signal, …)."
          after={<Switch variant="Primary" value={showFilters} onChange={setShowFilters} />}
        />
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Find the last message of quiet chats"
          description="When the app has only system events loaded for a chat (bridge renames, members joining), ask your homeserver once for that chat's last real message, in the background, and remember it. Off: such chats wait at the bottom until a message arrives."
          after={<Switch variant="Primary" value={serverLookup} onChange={setServerLookup} />}
        />
      </SequenceCard>
    </Box>
  );
}
