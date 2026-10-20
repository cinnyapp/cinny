import { useEffect, useMemo, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { roomMessagesFetcher } from '../media-viewer/roomWalker';
import {
  AvatarHistoryEntry,
  collectHistoryEvents,
  extractMemberAvatarHistory,
  extractRoomAvatarHistory,
  memberHistoryFilter,
  roomAvatarHistoryFilter,
  StateLikeEvent,
} from './avatarHistory';

export type AvatarHistoryState = {
  member: AvatarHistoryEntry[];
  room: AvatarHistoryEntry[];
  loading: boolean;
  /** false when the walk stopped at its bound and older pictures may exist. */
  complete: boolean;
  error?: string;
};

const cache = new Map<string, { at: number; events: StateLikeEvent[]; complete: boolean }>();
const CACHE_MS = 5 * 60 * 1000;

const fetchAll = async (
  mx: ReturnType<typeof useMatrixClient>,
  roomId: string,
  key: string,
  filter: Record<string, unknown>
) => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit;
  const fetchPage = roomMessagesFetcher(mx, roomId, filter);
  const res = await collectHistoryEvents((from) => fetchPage('b', from, 100), 20);
  const entry = { at: Date.now(), events: res.events, complete: res.complete };
  cache.set(key, entry);
  if (cache.size > 30) cache.delete(cache.keys().next().value as string);
  return entry;
};

/**
 * Profile-picture history of `userId` (and/or the room's own picture) as this
 * room saw it. Shows the current pictures from room state immediately, then
 * fills in the history from `/messages` filtered on the member's own state
 * events.
 */
export const useAvatarHistory = (
  room: Room,
  userId: string | undefined,
  includeRoom: boolean
): AvatarHistoryState => {
  const mx = useMatrixClient();
  const currentMember = userId ? room.getMember(userId)?.getMxcAvatarUrl() : undefined;
  const currentRoom = room.currentState.getStateEvents('m.room.avatar', '')?.getContent()?.url as
    | string
    | undefined;

  const initial = useMemo<AvatarHistoryState>(
    () => ({
      member: userId ? extractMemberAvatarHistory([], userId, currentMember) : [],
      room: includeRoom ? extractRoomAvatarHistory([], currentRoom) : [],
      loading: true,
      complete: true,
    }),
    [userId, includeRoom, currentMember, currentRoom]
  );
  const [state, setState] = useState<AvatarHistoryState>(initial);

  useEffect(() => {
    let alive = true;
    setState(initial);
    (async () => {
      try {
        const [m, r] = await Promise.all([
          userId
            ? fetchAll(mx, room.roomId, `${room.roomId}|m|${userId}`, memberHistoryFilter(userId))
            : undefined,
          includeRoom
            ? fetchAll(mx, room.roomId, `${room.roomId}|r`, roomAvatarHistoryFilter())
            : undefined,
        ]);
        if (!alive) return;
        setState({
          member: userId ? extractMemberAvatarHistory(m?.events ?? [], userId, currentMember) : [],
          room: includeRoom ? extractRoomAvatarHistory(r?.events ?? [], currentRoom) : [],
          loading: false,
          complete: (m?.complete ?? true) && (r?.complete ?? true),
        });
      } catch (e) {
        if (!alive) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: e instanceof Error ? e.message : String(e),
        }));
      }
    })();
    return () => {
      alive = false;
    };
  }, [mx, room, userId, includeRoom, currentMember, currentRoom, initial]);

  return state;
};
