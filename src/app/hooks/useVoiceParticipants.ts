import { MatrixClient, Room, RoomStateEvent } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { StateEvent } from '../../types/matrix/room';
import { getStateEvents } from '../utils/room';

export type VoiceParticipantInfo = {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
};

export const useVoiceParticipants = (
  mx: MatrixClient,
  room: Room
): VoiceParticipantInfo[] => {
  const [participants, setParticipants] = useState<VoiceParticipantInfo[]>([]);

  useEffect(() => {
    const updateParticipants = () => {
      const events = getStateEvents(room, StateEvent.VoiceParticipant);
      const active = events
        .filter((e) => e.getContent<{ active?: boolean }>().active === true)
        .map((e) => {
          const userId = e.getStateKey() ?? '';
          const member = room.getMember(userId);
          return {
            userId,
            displayName: member?.name ?? userId,
            avatarUrl: member?.getAvatarUrl(mx.baseUrl, 32, 32, 'crop', false, false) ?? undefined,
          };
        })
        .filter((p) => p.userId !== '');

      setParticipants(active);
    };

    updateParticipants();

    room.on(RoomStateEvent.Events, updateParticipants);
    return () => {
      room.off(RoomStateEvent.Events, updateParticipants);
    };
  }, [mx, room]);

  return participants;
};
