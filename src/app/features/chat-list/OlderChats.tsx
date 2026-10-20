import React, { useState } from 'react';
import { Avatar, Box, Button, Spinner, Text, color, config, toRem } from 'folds';
import { useNavigate } from 'react-router-dom';
import { NavCategory, NavCategoryHeader } from '../../components/nav';
import { LiteIndexEntry } from '../../../client/lite-index';
import { nameInitial } from '../startup-snapshot/snapshot';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { reviveSkippedRoom } from '../../../client/lite-room-load';
import { getDirectRoomPath, getHomeRoomPath } from '../../pages/pathUtils';
import type { ChatListScope, ChatListView } from './useChatList';

const dateLabel = (ts: number): string => {
  if (!ts) return '';
  try {
    return new Date(ts).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '';
  }
};

function OlderAvatar({ entry }: { entry: LiteIndexEntry }) {
  const mx = useMatrixClient();
  const useAuth = useMediaAuthentication();
  const [broken, setBroken] = useState(false);
  const src = entry.avatar
    ? mx.mxcUrlToHttp(entry.avatar, 32, 32, 'crop', undefined, false, useAuth)
    : null;
  return (
    <Avatar
      size="200"
      radii="400"
      style={{ backgroundColor: color.SurfaceVariant.Container, flexShrink: 0 }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Text as="span" size="H6">
          {nameInitial(entry.name)}
        </Text>
      )}
    </Avatar>
  );
}

type OlderChatsProps = {
  entries: LiteIndexEntry[];
  /** Bring the chat back and open it. Rejects with a readable message. */
  onLoad: (entry: LiteIndexEntry) => Promise<void>;
};

/**
 * "Older chats" — name-filter matches among the chats lite mode left out of this
 * load. One tap on "Load" brings just that chat back (no reload) and opens it.
 */
export function OlderChats({ entries, onLoad }: OlderChatsProps) {
  const [busy, setBusy] = useState<string>();
  const [failed, setFailed] = useState<Record<string, string>>({});

  if (entries.length === 0) return null;

  const load = async (entry: LiteIndexEntry) => {
    setBusy(entry.id);
    setFailed((f) => {
      const rest = { ...f };
      delete rest[entry.id];
      return rest;
    });
    try {
      await onLoad(entry);
    } catch (err) {
      setFailed((f) => ({
        ...f,
        [entry.id]: err instanceof Error ? err.message : 'Could not load this chat.',
      }));
    } finally {
      setBusy(undefined);
    }
  };

  return (
    <NavCategory data-testid="older-chats">
      <NavCategoryHeader>
        <Text size="O400" priority="300" style={{ padding: `0 ${config.space.S200}` }}>
          Older chats
        </Text>
      </NavCategoryHeader>
      <Text
        size="T200"
        priority="300"
        style={{ padding: `0 ${config.space.S200} ${config.space.S100}` }}
      >
        Not loaded, to keep the app fast. Tap Load to bring one back.
      </Text>
      {entries.map((entry) => {
        const loading = busy === entry.id;
        return (
          <Box
            key={entry.id}
            data-older-chat={entry.id}
            alignItems="Center"
            gap="200"
            style={{ padding: `${toRem(4)} ${config.space.S200}` }}
          >
            <OlderAvatar entry={entry} />
            <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
              <Text as="span" size="T300" truncate>
                {entry.name}
              </Text>
              <Text as="span" size="T200" priority="300" truncate>
                {failed[entry.id] ?? (entry.ts ? `Last message ${dateLabel(entry.ts)}` : '')}
              </Text>
            </Box>
            <Button
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              disabled={!!busy}
              onClick={() => load(entry)}
              before={loading ? <Spinner size="100" variant="Secondary" /> : undefined}
              aria-label={`Load ${entry.name}`}
            >
              <Text size="B300">{loading ? 'Loading…' : 'Load'}</Text>
            </Button>
          </Box>
        );
      })}
    </NavCategory>
  );
}

/** The group as Home and Direct use it: "Load" revives just that chat, then opens it. */
export function OlderChatsGroup({ view, scope }: { view: ChatListView; scope: ChatListScope }) {
  const mx = useMatrixClient();
  const navigate = useNavigate();
  return (
    <OlderChats
      entries={view.older}
      onLoad={async (entry) => {
        await reviveSkippedRoom(mx, entry.id);
        navigate(scope === 'home' ? getHomeRoomPath(entry.id) : getDirectRoomPath(entry.id));
      }}
    />
  );
}
