import { MatrixClient, MatrixEvent, RoomMember, RoomMemberEvent } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';

export const useRoomMembers = (mx: MatrixClient, roomId: string): RoomMember[] => {
  const [members, setMembers] = useState<RoomMember[]>([]);

  useEffect(() => {
    const room = mx.getRoom(roomId);
    let loadingMembers = true;
    let disposed = false;

    const updateMemberList = (event?: MatrixEvent) => {
      if (!room || disposed || (event && event.getRoomId() !== roomId)) return;
      if (loadingMembers) return;
      setMembers(room.getMembers());
    };

    if (room) {
      setMembers(room.getMembers());
      room.loadMembersIfNeeded().then(() => {
        loadingMembers = false;
        if (disposed) return;
        updateMemberList();
      });
    }

    mx.on(RoomMemberEvent.Membership, updateMemberList);
    mx.on(RoomMemberEvent.PowerLevel, updateMemberList);
    return () => {
      disposed = true;
      mx.removeListener(RoomMemberEvent.Membership, updateMemberList);
      mx.removeListener(RoomMemberEvent.PowerLevel, updateMemberList);
    };
  }, [mx, roomId]);

  return members;
};
