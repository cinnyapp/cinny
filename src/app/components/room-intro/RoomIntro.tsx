import React, { useCallback, useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Icon,
  Icons,
  Spinner,
  Text,
  as,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useAtomValue } from 'jotai';
import { IRoomCreateContent, Membership, StateEvent } from '../../../types/matrix/room';
import { getMemberDisplayName, getStateEvent } from '../../utils/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getMxIdLocalPart, mxcUrlToHttp, removeRoomIdFromMDirect } from '../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { RoomAvatar } from '../room-avatar';
import { nameInitials } from '../../utils/common';
import { useRoomAvatar, useRoomName, useRoomTopic } from '../../hooks/useRoomMeta';
import { mDirectAtom } from '../../state/mDirectList';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { InviteUserPrompt } from '../invite-user-prompt';
import { InfoCard } from '../info-card';
import { DirectInvitePrompt } from '../direct-invite-prompt';

export type RoomIntroProps = {
  room: Room;
};

export const RoomIntro = as<'div', RoomIntroProps>(({ room, ...props }, ref) => {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const { navigateRoom } = useRoomNavigate();
  const mDirects = useAtomValue(mDirectAtom);
  const isDirectConversation = mDirects.has(room.roomId);
  const [invitePrompt, setInvitePrompt] = useState(false);
  const [directInvitePrompt, setDirectInvitePrompt] = useState(false);

  const createEvent = getStateEvent(room, StateEvent.RoomCreate);
  const avatarMxc = useRoomAvatar(room, mDirects.has(room.roomId));
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const avatarHttpUrl = avatarMxc ? mxcUrlToHttp(mx, avatarMxc, useAuthentication) : undefined;

  const createContent = createEvent?.getContent<IRoomCreateContent>();
  const ts = createEvent?.getTs();
  const creatorId = createEvent?.getSender();
  const creatorName =
    creatorId && (getMemberDisplayName(room, creatorId) ?? getMxIdLocalPart(creatorId));
  const prevRoomId = createContent?.predecessor?.room_id;

  const [prevRoomState, joinPrevRoom] = useAsyncCallback(
    useCallback(async (roomId: string) => mx.joinRoom(roomId), [mx])
  );

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  const handleInvite = () => {
    if (isDirectConversation) {
      setDirectInvitePrompt(true);
      return;
    }
    setInvitePrompt(true);
  };

  const handleInviteDirect = () => {
    setDirectInvitePrompt(false);
    setInvitePrompt(true);
  };

  const [convertState, convertToRoom] = useAsyncCallback<void, Error, []>(
    useCallback(async () => {
      await removeRoomIdFromMDirect(mx, room.roomId);
    }, [mx, room.roomId])
  );

  const handleConvertAndInvite = () => {
    if (convertState.status === AsyncStatus.Loading) return;
    convertToRoom().catch(() => {});
  };

  useEffect(() => {
    if (convertState.status === AsyncStatus.Success) {
      setDirectInvitePrompt(false);
      setInvitePrompt(true);
    }
  }, [convertState.status]);

  return (
    <Box direction="Column" grow="Yes" gap="500" {...props} ref={ref}>
      <Box>
        <Avatar size="500">
          <RoomAvatar
            roomId={room.roomId}
            src={avatarHttpUrl ?? undefined}
            alt={name}
            renderFallback={() => <Text size="H2">{nameInitials(name)}</Text>}
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
              {` on ${timeDayMonthYear(ts)} ${timeHourMinute(ts, hour24Clock)}`}
            </Text>
          )}
          {isDirectConversation && (
            <InfoCard
              variant="Primary"
              before={<Icon size="100" src={Icons.User} />}
              beforeAlign="Center"
              description="This is a direct message"
              after={
                <Button onClick={handleInvite} variant="Secondary" size="300" radii="300">
                  <Text size="B300">Invite another Member</Text>
                </Button>
              }
            />
          )}
        </Box>
        <Box gap="200" wrap="Wrap">
          {!isDirectConversation && (
            <Button onClick={handleInvite} variant="Secondary" size="300" radii="300">
              <Text size="B300">Invite another Member</Text>
            </Button>
          )}
          {typeof prevRoomId === 'string' &&
            (mx.getRoom(prevRoomId)?.getMyMembership() === Membership.Join ? (
              <Button
                onClick={() => navigateRoom(prevRoomId, createContent?.predecessor?.event_id)}
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
        {invitePrompt && <InviteUserPrompt room={room} requestClose={() => setInvitePrompt(false)} />}
        {directInvitePrompt && (
          <DirectInvitePrompt
            onCancel={() => setDirectInvitePrompt(false)}
            onInviteDirect={handleInviteDirect}
            onConvertAndInvite={handleConvertAndInvite}
            converting={convertState.status === AsyncStatus.Loading}
            convertError={
              convertState.status === AsyncStatus.Error ? convertState.error.message : undefined
            }
          />
        )}
      </Box>
    </Box>
  );
});
