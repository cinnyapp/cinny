import React, { useCallback } from 'react';
import { Avatar, Box, Button, Spinner, Text, as } from 'folds';
import { Room } from 'matrix-js-sdk';
import { openInviteUser } from '../../../client/action/navigation';
import { useStateEvent } from '../../hooks/useStateEvent';
import { IRoomCreateContent, Membership, StateEvent } from '../../../types/matrix/room';
import { getMemberDisplayName, getStateEvent } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdLocalPart } from '../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { RoomAvatar } from '../room-avatar';
import { nameInitials } from '../../utils/common';
import { useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';

export type RoomIntroProps = {
  room: Room;
};

export const RoomIntro = as<'div', RoomIntroProps>(({ room, ...props }, ref) => {
  const mx = useMatrixClient();
  const createEvent = getStateEvent(room, StateEvent.RoomCreate);
  const avatarEvent = useStateEvent(room, StateEvent.RoomAvatar);
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const createContent = createEvent?.getContent<IRoomCreateContent>();

  const { navigateRoom } = useRoomNavigate();

  const ts = createEvent?.getTs();
  const creatorId = createEvent?.getSender();
  const creatorName =
    creatorId && (getMemberDisplayName(room, creatorId) ?? getMxIdLocalPart(creatorId));
  const prevRoomId = createContent?.predecessor?.room_id;
  const avatarMxc = (avatarEvent?.getContent().url as string) || undefined;
  const avatarHttpUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc) : undefined;

  const [prevRoomState, joinPrevRoom] = useAsyncCallback(
    useCallback(async (roomId: string) => mx.joinRoom(roomId), [mx])
  );

  return (
    <Box direction="Column" grow="Yes" gap="500" {...props} ref={ref}>
      <Box>
        <Avatar size="500">
          <RoomAvatar
            src={avatarHttpUrl ?? undefined}
            alt={name}
            renderInitials={() => <Text size="H2">{nameInitials(name)}</Text>}
          />
        </Avatar>
      </Box>
      <Box direction="Column" gap="300">
        <Box direction="Column" gap="100">
          <Text size="H3" priority="500">
            {name}
          </Text>
          <Text size="T400" priority="400">
            {typeof topic === 'string' ? topic : 'This is the beginning of conversation.'}
          </Text>
          {creatorName && ts && (
            <Text size="T200" priority="300">
              {'Created by '}
              <b>@{creatorName}</b>
              {` on ${timeDayMonthYear(ts)} ${timeHourMinute(ts)}`}
            </Text>
          )}
        </Box>
        <Box gap="200" wrap="Wrap">
          <Button
            onClick={() => openInviteUser(room.roomId)}
            variant="Secondary"
            size="300"
            radii="300"
          >
            <Text size="B300">Invite Member</Text>
          </Button>
          {typeof prevRoomId === 'string' &&
            (mx.getRoom(prevRoomId)?.getMyMembership() === Membership.Join ? (
              <Button
                onClick={() => navigateRoom(prevRoomId)}
                variant="Success"
                size="300"
                fill="Soft"
                radii="300"
              >
                <Text size="B300">Open Old Room</Text>
              </Button>
            ) : (
              <Button
                onClick={() => joinPrevRoom(prevRoomId)}
                variant="Secondary"
                size="300"
                fill="Soft"
                radii="300"
                disabled={prevRoomState.status === AsyncStatus.Loading}
                after={
                  prevRoomState.status === AsyncStatus.Loading ? (
                    <Spinner size="50" variant="Secondary" fill="Soft" />
                  ) : undefined
                }
              >
                <Text size="B300">Join Old Room</Text>
              </Button>
            ))}
        </Box>
      </Box>
    </Box>
  );
});
