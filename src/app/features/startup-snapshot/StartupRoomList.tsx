import React, { useState } from 'react';
import { Avatar, Badge, Box, color, Spinner, Text, toRem } from 'folds';
import { useNavigate } from 'react-router-dom';
import { getHomeRoomPath } from '../../pages/pathUtils';
import { nameInitial, SnapshotRoom, StartupSnapshot } from './snapshot';

function SnapshotAvatar({ room }: { room: SnapshotRoom }) {
  const [broken, setBroken] = useState(false);
  return (
    <Avatar size="200" radii={room.dm ? '400' : '300'}>
      {room.avatar && !broken ? (
        <img
          src={room.avatar}
          alt=""
          loading="lazy"
          onError={() => setBroken(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      ) : (
        <Text as="span" size="H6">
          {nameInitial(room.name)}
        </Text>
      )}
    </Avatar>
  );
}

type StartupRoomListProps = {
  snapshot: StartupSnapshot;
  loaded: number;
  skipped: number;
};

/**
 * Shown instead of the bare "Heating up" spinner while the saved chats are
 * being rebuilt: the chat list as it was last time, drawn from the startup
 * snapshot in the very first render. Tapping a chat opens it as soon as the
 * app is ready (the route changes right away; the real app takes over on the
 * same URL).
 */
export function StartupRoomList({ snapshot, loaded, skipped }: StartupRoomListProps) {
  const navigate = useNavigate();
  const [pending, setPending] = useState<string>();
  const target = Math.max(snapshot.total, 1);
  const pct = Math.min(99, Math.round((loaded / target) * 100));
  const narrow = typeof window !== 'undefined' && window.innerWidth < 750;

  const open = (roomId: string) => {
    setPending(roomId);
    navigate(getHomeRoomPath(roomId));
  };

  return (
    <Box
      grow="Yes"
      style={{ height: '100dvh', minHeight: '100%', backgroundColor: color.Background.Container }}
      data-testid="startup-snapshot"
    >
      <Box
        direction="Column"
        style={{
          width: '100%',
          maxWidth: narrow ? undefined : toRem(320),
          borderRight: `1px solid ${color.Background.ContainerLine}`,
          backgroundColor: color.Background.Container,
          overflow: 'hidden',
        }}
      >
        <Box
          direction="Column"
          gap="100"
          shrink="No"
          style={{ padding: `${toRem(12)} ${toRem(16)}` }}
        >
          <Text size="H4">Home</Text>
          <Box alignItems="Center" gap="200">
            <Spinner variant="Secondary" size="50" />
            <Text size="T200" priority="300" data-testid="startup-progress">
              {loaded > 0
                ? `Getting your chats ready… ${loaded.toLocaleString()} loaded`
                : 'Getting your chats ready…'}
              {skipped > 0 ? ` · ${skipped.toLocaleString()} old ones skipped` : ''}
            </Text>
          </Box>
          <div
            style={{
              height: 2,
              borderRadius: 1,
              background: color.SurfaceVariant.Container,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${loaded > 0 ? pct : 3}%`,
                background: color.Primary.Main,
                transition: 'width 0.8s linear',
              }}
            />
          </div>
        </Box>
        <Box direction="Column" grow="Yes" style={{ overflowY: 'auto', padding: `0 ${toRem(8)}` }}>
          {snapshot.rooms.map((room) => {
            const isPending = pending === room.id;
            return (
              <button
                key={room.id}
                type="button"
                data-snapshot-room={room.id}
                onClick={() => open(room.id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: toRem(8),
                  padding: `${toRem(6)} ${toRem(8)}`,
                  borderRadius: toRem(8),
                  opacity: room.muted && !isPending ? 0.55 : 1,
                  backgroundColor: isPending ? color.Background.ContainerActive : undefined,
                }}
              >
                <SnapshotAvatar room={room} />
                <Box grow="Yes" direction="Column" style={{ minWidth: 0 }}>
                  <Text
                    as="span"
                    size="T300"
                    truncate
                    style={{ fontWeight: room.unread && !room.muted ? 600 : undefined }}
                  >
                    {room.name}
                  </Text>
                  {isPending && (
                    <Text as="span" size="T200" priority="300">
                      Opening as soon as it is ready…
                    </Text>
                  )}
                </Box>
                {!!room.unread && (
                  <Badge
                    variant={room.highlight ? 'Success' : 'Secondary'}
                    fill={room.muted ? 'Soft' : 'Solid'}
                    radii="Pill"
                    size="400"
                  >
                    <Text as="span" size="L400">
                      {room.unread > 999 ? '999+' : room.unread}
                    </Text>
                  </Badge>
                )}
              </button>
            );
          })}
        </Box>
      </Box>
      {!narrow && (
        <Box
          grow="Yes"
          alignItems="Center"
          justifyContent="Center"
          direction="Column"
          gap="200"
          style={{ minWidth: 0, padding: toRem(24) }}
        >
          <Text size="T300" priority="300" align="Center">
            Your chats from last time. Pick one — it opens as soon as everything is ready.
          </Text>
        </Box>
      )}
    </Box>
  );
}
