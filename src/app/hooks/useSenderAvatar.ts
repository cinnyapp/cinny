import { useCallback, useSyncExternalStore } from 'react';
import { MatrixClient, MatrixEvent, Room, RoomStateEvent } from 'matrix-js-sdk';
import { useMatrixClient } from './useMatrixClient';
import { useMediaAuthentication } from './useMediaAuthentication';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import { getSenderAvatarMxcs } from '../utils/senderAvatar';
import { mxcUrlToHttp } from '../utils/matrix';

/**
 * ONE listener set per room, shared by every avatar shown in that room — a
 * timeline has hundreds of messages and each used to need its own listener
 * (MaxListenersExceeded). Fires when a member event arrives or changes
 * (lazy-loaded members, a new profile picture, a stored /sync snapshot being
 * caught up) and when the room's picture / bridge info changes.
 */
type RoomPeopleSub = { listeners: Set<() => void>; detach: () => void };
const roomSubs = new Map<string, RoomPeopleSub>();

const PICTURE_STATE = new Set(['m.room.avatar', 'm.bridge', 'uk.half-shot.bridge']);

const attach = (mx: MatrixClient, room: Room, listeners: Set<() => void>): (() => void) => {
  const notify = () => listeners.forEach((l) => l());
  const onMember = (_e: MatrixEvent, state: { roomId?: string }) => {
    if (state?.roomId === room.roomId) notify();
  };
  const onState = (e: MatrixEvent) => {
    if (e.getRoomId() === room.roomId && PICTURE_STATE.has(e.getType())) notify();
  };
  room.on(RoomStateEvent.Members, onMember);
  room.on(RoomStateEvent.NewMember, onMember);
  mx.on(RoomStateEvent.Events, onState);
  return () => {
    room.removeListener(RoomStateEvent.Members, onMember);
    room.removeListener(RoomStateEvent.NewMember, onMember);
    mx.removeListener(RoomStateEvent.Events, onState);
  };
};

export const subscribeRoomPeople = (
  mx: MatrixClient,
  room: Room,
  listener: () => void
): (() => void) => {
  let sub = roomSubs.get(room.roomId);
  if (!sub) {
    const listeners = new Set<() => void>();
    sub = { listeners, detach: attach(mx, room, listeners) };
    roomSubs.set(room.roomId, sub);
  }
  sub.listeners.add(listener);
  return () => {
    const current = roomSubs.get(room.roomId);
    if (!current) return;
    current.listeners.delete(listener);
    if (current.listeners.size === 0) {
      current.detach();
      roomSubs.delete(room.roomId);
    }
  };
};

export type SenderAvatar = {
  /** http(s) URL to try first */
  src?: string;
  /** next candidate when `src` fails to load (e.g. the chat's picture) */
  fallbackSrc?: string;
};

const SEP = '\u0000';

/**
 * The picture of a person inside a room — single source of truth for the
 * timeline (see utils/senderAvatar.ts for the order). Live: re-reads when the
 * member event / room picture changes, so a newer picture shows without a
 * reload.
 */
export const useSenderAvatar = (room: Room, userId: string, size = 48): SenderAvatar => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const [preferContactPhoto] = useSetting(settingsAtom, 'preferContactPhoto');

  const subscribe = useCallback(
    (listener: () => void) => subscribeRoomPeople(mx, room, listener),
    [mx, room]
  );
  // A string snapshot: only the avatars whose pictures really changed re-render.
  const snapshot = useSyncExternalStore(subscribe, () => {
    const { mxc, fallbackMxc } = getSenderAvatarMxcs(room, userId, preferContactPhoto);
    return `${mxc ?? ''}${SEP}${fallbackMxc ?? ''}`;
  });

  const [mxc, fallbackMxc] = snapshot.split(SEP);
  const toHttp = (m: string) =>
    m ? mxcUrlToHttp(mx, m, useAuthentication, size, size, 'crop') ?? undefined : undefined;
  return { src: toHttp(mxc), fallbackSrc: toHttp(fallbackMxc) };
};

/**
 * Same picture for non-hook callers (lists rendered in a loop, notifications).
 */
export const getSenderAvatar = (
  mx: MatrixClient,
  room: Room,
  userId: string,
  useAuthentication: boolean,
  size = 48
): SenderAvatar => {
  const { mxc, fallbackMxc } = getSenderAvatarMxcs(room, userId);
  const toHttp = (m?: string) =>
    m ? mxcUrlToHttp(mx, m, useAuthentication, size, size, 'crop') ?? undefined : undefined;
  return { src: toHttp(mxc), fallbackSrc: toHttp(fallbackMxc) };
};
