import { useEffect, useReducer, useState } from 'react';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import {
  MatrixEvent,
  Room,
  RoomEvent,
  RoomEventHandlerMap,
  RoomState,
  RoomStateEvent,
} from 'matrix-js-sdk';
import { StateEvent } from '../../types/matrix/room';
import { useStateEvent } from './useStateEvent';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import { getDmAvatarMxc } from '../utils/dmAvatar';

/**
 * Re-render when the room's member list changes (members are lazy-loaded, so
 * the other person of a 1:1 chat often arrives after the first render).
 */
const useRoomMembersVersion = (room: Room, enabled: boolean): number => {
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  useEffect(() => {
    if (!enabled) return undefined;
    const handler = (_e: MatrixEvent, state: RoomState) => {
      if (state?.roomId === room.roomId) bump();
    };
    room.on(RoomStateEvent.Members, handler);
    room.on(RoomStateEvent.NewMember, handler);
    return () => {
      room.removeListener(RoomStateEvent.Members, handler);
      room.removeListener(RoomStateEvent.NewMember, handler);
    };
  }, [room, enabled]);
  return version;
};

export const useRoomAvatar = (room: Room, dm?: boolean): string | undefined => {
  const avatarEvent = useStateEvent(room, StateEvent.RoomAvatar);
  const [preferContactPhoto] = useSetting(settingsAtom, 'preferContactPhoto');
  useRoomMembersVersion(room, !!dm);

  if (dm) {
    // The other person's picture, falling back to the room's (utils/dmAvatar.ts).
    return getDmAvatarMxc(room, preferContactPhoto);
  }
  const content = avatarEvent?.getContent();
  const avatarMxc = content && typeof content.url === 'string' ? content.url : undefined;

  return avatarMxc;
};

export const useRoomName = (room: Room): string => {
  const [name, setName] = useState(room.name);

  useEffect(() => {
    setName(room.name);

    const handleRoomNameChange: RoomEventHandlerMap[RoomEvent.Name] = () => {
      setName(room.name);
    };
    room.on(RoomEvent.Name, handleRoomNameChange);
    return () => {
      room.removeListener(RoomEvent.Name, handleRoomNameChange);
    };
  }, [room]);

  return name;
};

export const useRoomTopic = (room: Room): string | undefined => {
  const topicEvent = useStateEvent(room, StateEvent.RoomTopic);

  const content = topicEvent?.getContent();
  const topic = content && typeof content.topic === 'string' ? content.topic : undefined;

  return topic;
};

export const useRoomJoinRule = (room: Room): RoomJoinRulesEventContent | undefined => {
  const mEvent = useStateEvent(room, StateEvent.RoomJoinRules);
  const joinRuleContent = mEvent?.getContent<RoomJoinRulesEventContent>();
  return joinRuleContent;
};
