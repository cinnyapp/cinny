import { useCallback, useEffect, useMemo } from 'react';
import { getMembers, GetMembersOK } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { StateEventWithoutRoomId } from 'neurone/lib/api/types';
import { useClient } from './useClient';
import { useObservableValue } from './useObservableValue';
import {
  getJoinRoomMemberId,
  JoinRoomMemberObject,
  sessionValue,
} from '../../client/storage/collections';
import { useAlive } from './useAlive';

export const usePendingMembers = (roomId: string): boolean => {
  const ct = useClient();
  const pendingMemberRooms = useObservableValue(ct.pendingMemberRooms);
  const hasPendingMembers = useMemo(
    () => pendingMemberRooms.includes(roomId),
    [pendingMemberRooms, roomId]
  );

  return hasPendingMembers;
};

export const usePendingMemberLoader = (roomId: string, pending: boolean) => {
  const ct = useClient();
  const alive = useAlive();

  const loadMembers = useCallback(
    async (signal?: AbortSignal) => {
      const response = await ct.requestAuthJSON(getMembers({ pathParams: { roomId } }), signal);
      const [err, result] = await parseMatrixResp<GetMembersOK>(response);
      if (err) {
        throw new Error(printMatrixError(err));
      }

      const memberObjects: JoinRoomMemberObject[] =
        result?.chunk.map((event) => {
          const eventWithoutRoomId: StateEventWithoutRoomId = event;
          if ('room_id' in eventWithoutRoomId) delete eventWithoutRoomId.room_id;

          const obj: JoinRoomMemberObject = {
            id: getJoinRoomMemberId(roomId, eventWithoutRoomId.state_key),
            roomId,
            userId: eventWithoutRoomId.state_key,
            event: eventWithoutRoomId,
          };

          return obj;
        }) ?? [];

      if (alive()) {
        await ct.storage.joinRoomMember.write.putMultiple(memberObjects);
        await ct.storage.sessionValue.write.put({
          id: sessionValue.pendingMemberRooms.id,
          value: ct.pendingMemberRooms.read.filter((rId) => rId !== roomId),
        });
      }
    },
    [ct, roomId, alive]
  );

  useEffect(() => {
    const abortController = new AbortController();

    if (pending) {
      loadMembers(abortController.signal);
    }

    return () => {
      abortController.abort();
    };
  }, [pending, loadMembers]);
};
