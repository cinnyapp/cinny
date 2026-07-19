import { useEffect, useState } from 'react';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import { Room, RoomEvent, RoomEventHandlerMap } from 'matrix-js-sdk';
import { StateEvent } from '../../types/matrix/room';
import { useStateEvent } from './useStateEvent';

export const useRoomAvatar = (room: Room, dm?: boolean): string | undefined => {
  const avatarEvent = useStateEvent(room, StateEvent.RoomAvatar);

  if (dm) {
    return room.getAvatarFallbackMember()?.getMxcAvatarUrl();
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
