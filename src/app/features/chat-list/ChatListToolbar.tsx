import React, { MouseEventHandler, useState } from 'react';
import {
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  Input,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
  config,
  toRem,
} from 'folds';
import FocusTrap from '../../components/focus-trap';
import { stopPropagation } from '../../utils/keyboard';
import {
  CHAT_FILTERS,
  ChatFilter,
  ChatSort,
  MutedMode,
  chatFilterLabel,
} from '../../utils/chatList';
import type { ChatListScope, ChatListView } from './useChatList';
import * as css from './styles.css';

export const CHAT_SORT_LABEL: Record<ChatSort, string> = {
  activity: 'Last message',
  unread: 'Unread first',
  name: 'Name (A–Z)',
};

export const MUTED_MODE_LABEL: Record<MutedMode, string> = {
  stay: 'Stay put (only you move them)',
  bottom: 'Always at the bottom',
  hide: 'Hidden from All',
  normal: 'Move like any other chat',
};

const SORTS: ChatSort[] = ['activity', 'unread', 'name'];
const MUTED_MODES: MutedMode[] = ['stay', 'bottom', 'hide', 'normal'];

function SortMenu({ view, requestClose }: { view: ChatListView; requestClose: () => void }) {
  return (
    <Menu style={{ maxWidth: toRem(280), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <Text size="L400" style={{ padding: `${config.space.S100} ${config.space.S200}` }}>
          Sort chats by
        </Text>
        {SORTS.map((s) => (
          <MenuItem
            key={s}
            size="300"
            radii="300"
            variant={view.sort === s ? 'Primary' : 'Surface'}
            aria-pressed={view.sort === s}
            onClick={() => {
              view.setSort(s);
              requestClose();
            }}
          >
            <Text size="T300">{CHAT_SORT_LABEL[s]}</Text>
          </MenuItem>
        ))}
        <Line size="300" />
        <Text size="L400" style={{ padding: `${config.space.S100} ${config.space.S200}` }}>
          Muted &amp; archived chats
        </Text>
        {MUTED_MODES.map((m) => (
          <MenuItem
            key={m}
            size="300"
            radii="300"
            variant={view.mutedMode === m ? 'Primary' : 'Surface'}
            aria-pressed={view.mutedMode === m}
            onClick={() => {
              view.setMutedMode(m);
              requestClose();
            }}
          >
            <Text size="T300">{MUTED_MODE_LABEL[m]}</Text>
          </MenuItem>
        ))}
      </Box>
    </Menu>
  );
}

type ChatListToolbarProps = {
  view: ChatListView;
  scope: ChatListScope;
};

/**
 * The bar above the chat list: a name filter, a sort menu, and one row of
 * one-tap filter chips (the last one picked is remembered).
 */
export function ChatListToolbar({ view, scope }: ChatListToolbarProps) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((current) => (current ? undefined : cords));
  };

  const chips: ChatFilter[] = [
    ...CHAT_FILTERS.filter((f) => scope === 'home' || (f !== 'people' && f !== 'groups')),
    ...view.networks.map((n) => `net:${n}` as ChatFilter),
  ];

  return (
    <Box className={css.Toolbar} direction="Column" gap="200" data-chat-list-toolbar>
      <Box gap="100" alignItems="Center">
        <Input
          style={{ flexGrow: 1, minWidth: 0 }}
          size="300"
          radii="Pill"
          variant="Background"
          outlined
          placeholder="Filter by name"
          aria-label="Filter chats by name"
          value={view.query}
          onChange={(evt) => view.setQuery(evt.currentTarget.value)}
          onKeyDown={(evt) => {
            if (evt.key === 'Escape' && view.query) {
              evt.stopPropagation();
              view.setQuery('');
            }
          }}
          before={<Icon size="50" src={Icons.Search} />}
          after={
            view.query ? (
              <IconButton
                size="300"
                radii="Pill"
                variant="Background"
                aria-label="Clear name filter"
                onClick={() => view.setQuery('')}
              >
                <Icon size="50" src={Icons.Cross} />
              </IconButton>
            ) : undefined
          }
        />
        <IconButton
          size="300"
          radii="300"
          variant="Background"
          aria-label="Sort chats"
          aria-pressed={!!menuAnchor}
          title={`Sorted by: ${CHAT_SORT_LABEL[view.sort]}`}
          onClick={handleOpenMenu}
        >
          <Icon size="100" src={Icons.Sort} />
        </IconButton>
      </Box>
      <div className={css.ChipRow} role="toolbar" aria-label="Chat filters">
        {chips.map((f) => {
          const selected = view.filter === f;
          return (
            <Chip
              key={f}
              className={css.FilterChip}
              size="400"
              radii="Pill"
              variant={selected ? 'Primary' : 'SurfaceVariant'}
              fill={selected ? 'Soft' : 'None'}
              outlined
              aria-pressed={selected}
              data-filter={f}
              onClick={() => view.setFilter(selected && f !== 'all' ? 'all' : f)}
            >
              <Text size="T200">{chatFilterLabel(f)}</Text>
            </Chip>
          );
        })}
      </div>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <SortMenu view={view} requestClose={() => setMenuAnchor(undefined)} />
          </FocusTrap>
        }
      />
    </Box>
  );
}

export function ChatListNoMatch({ view }: { view: ChatListView }) {
  return (
    <Box direction="Column" gap="200" alignItems="Center" style={{ padding: config.space.S400 }}>
      <Text size="T300" align="Center" priority="300">
        {view.query ? `No chats named “${view.query}”` : 'No chats here'}
        {view.filter !== 'all' ? ` in ${chatFilterLabel(view.filter)}` : ''}.
      </Text>
      {(view.filter !== 'all' || view.query) && (
        <Chip
          size="400"
          radii="Pill"
          variant="SurfaceVariant"
          outlined
          onClick={() => {
            view.setFilter('all');
            view.setQuery('');
          }}
        >
          <Text size="T200">Show all chats</Text>
        </Chip>
      )}
    </Box>
  );
}
