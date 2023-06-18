import { MatrixClient, MatrixEvent, RoomMember, RoomMemberEvent } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { useAlive } from './useAlive';

export const useRoomMembers = (mx: MatrixClient, roomId: string): RoomMember[] => {
  const [members, setMembers] = useState<RoomMember[]>([]);
  const alive = useAlive();

  useEffect(() => {
    const room = mx.getRoom(roomId);
    let loadingMembers = true;

    const updateMemberList = (event?: MatrixEvent) => {
      if (!room || !alive || (event && event.getRoomId() !== roomId)) return;
      if (loadingMembers) return;
      setMembers(room.getMembers());
    };

    if (room) {
      setMembers(room.getMembers());
      room.loadMembersIfNeeded().then(() => {
        loadingMembers = false;
        if (!alive) return;
        updateMemberList();
      });
    }

    mx.on(RoomMemberEvent.Membership, updateMemberList);
    mx.on(RoomMemberEvent.PowerLevel, updateMemberList);
    return () => {
      mx.removeListener(RoomMemberEvent.Membership, updateMemberList);
      mx.removeListener(RoomMemberEvent.PowerLevel, updateMemberList);
    };
  }, [mx, roomId, alive]);

  return members;
};
