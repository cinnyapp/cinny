import React, { useCallback } from 'react';
import { Box, Button, Spinner, Text, color } from 'folds';
import { postJoin, PostJoinOK } from 'neurone/lib/api/matrix/client/v3/join';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import * as css from './RoomTombstone.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { StateEventType } from '../../../types/matrix/room';
import { RoomInputPlaceholder } from './RoomInputPlaceholder';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useClient } from '../../hooks/useClient';
import { useRoomStateEvent } from '../../hooks/storage/useRoomStateEvent';
import { useAllJoinedRoomsSet } from '../../hooks/useAllJoinedRoomsSet';
import { getMxIdServer } from '../../utils/matrix';

type RoomTombstoneProps = { roomId: string; replacementRoomId: string };
export function RoomTombstone({ roomId, replacementRoomId }: RoomTombstoneProps) {
  const ct = useClient();
  const { navigateRoom } = useRoomNavigate();
  const joinedRooms = useAllJoinedRoomsSet();
  const tombstoneEventResult = useRoomStateEvent(roomId, StateEventType.RoomTombstone, '');
  const tombstoneEvent = tombstoneEventResult.value;
  const { content } = tombstoneEvent?.event ?? {};
  const body =
    content && 'body' in content && typeof content.body === 'string'
      ? content.body.trim()
      : undefined;

  const [joinState, handleJoin] = useAsyncCallback<string, Error, []>(
    useCallback(async () => {
      const sender = tombstoneEvent?.event.sender;
      const senderServer = sender ? getMxIdServer(sender) : undefined;
      const via = senderServer ? [senderServer] : undefined;
      const response = await ct.requestAuthJSON(
        postJoin({
          pathParams: { roomIdOrAlias: replacementRoomId },
          searchParams: { server_name: via, via },
        })
      );
      const [err, result] = await parseMatrixResp<PostJoinOK>(response);
      if (err) throw new Error(printMatrixError(err));
      return result.room_id;
    }, [ct, replacementRoomId, tombstoneEvent])
  );

  const handleOpen = () => {
    if (joinedRooms.has(replacementRoomId)) navigateRoom(replacementRoomId);
    if (joinState.status === AsyncStatus.Success) navigateRoom(joinState.data);
  };

  return (
    <RoomInputPlaceholder alignItems="Center" gap="600" className={css.RoomTombstone}>
      <Box direction="Column" grow="Yes">
        <Text size="T400">{body || 'This room has been replaced and is no longer active.'}</Text>
        {joinState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {joinState.error.message ?? 'Failed to join replacement room!'}
          </Text>
        )}
      </Box>
      <Box shrink="No">
        {joinedRooms.has(replacementRoomId) || joinState.status === AsyncStatus.Success ? (
          <Button onClick={handleOpen} size="300" variant="Success" fill="Solid" radii="300">
            <Text size="B300">Open New Room</Text>
          </Button>
        ) : (
          <Button
            onClick={handleJoin}
            size="300"
            variant="Primary"
            fill="Solid"
            radii="300"
            before={
              joinState.status === AsyncStatus.Loading && (
                <Spinner size="100" variant="Primary" fill="Solid" />
              )
            }
            disabled={joinState.status === AsyncStatus.Loading}
          >
            <Text size="B300">Join New Room</Text>
          </Button>
        )}
      </Box>
    </RoomInputPlaceholder>
  );
}
