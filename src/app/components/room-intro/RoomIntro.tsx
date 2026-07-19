import React, { useState } from 'react';
import { Avatar, Box, Button, Text, as } from 'folds';
import { timeDayMonthYear, timeHourMinute } from '../../utils/time';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { RoomAvatar } from '../room-avatar';
import { nameInitials } from '../../utils/common';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { InviteUserPrompt } from '../invite-user-prompt';
import { useClient } from '../../hooks/useClient';
import { useRoom } from '../../hooks/useRoom';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useRoomTopic } from '../../hooks/storage/useRoomTopic';
import { useRoomStateEvent } from '../../hooks/storage/useRoomStateEvent';
import { StateEventType } from '../../../types/matrix/room';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';

export const RoomIntro = as<
  'div',
  {
    name: string;
    avatar?: string;
  }
>(({ name, avatar, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const useAuthentication = useMediaAuthentication();
  const { navigateRoom } = useRoomNavigate();
  const [invitePrompt, setInvitePrompt] = useState(false);
  const { getName } = useRoomMembersAPI();

  const topic = useRoomTopic(roomId);
  const avatarHttpUrl = avatar
    ? mxcToHttp(ct.session.baseUrl, avatar, useAuthentication).url()
    : undefined;

  const createResult = useRoomStateEvent(roomId, StateEventType.RoomCreate, '');
  const event = createResult.value?.event;
  const content = event?.content;

  const ts = event?.origin_server_ts;
  const creatorId = event?.sender;
  const creatorName = creatorId && getName(creatorId);

  const prevRoomId =
    content &&
    'predecessor' in event.content &&
    typeof event.content.predecessor === 'object' &&
    event.content.predecessor &&
    'room_id' in event.content.predecessor &&
    event.content.predecessor.room_id;

  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  return (
    <Box direction="Column" grow="Yes" gap="500" {...props} ref={ref}>
      <Box>
        <Avatar size="500">
          <RoomAvatar
            roomId={roomId}
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
        </Box>
        <Box gap="200" wrap="Wrap">
          <Button onClick={() => setInvitePrompt(true)} variant="Secondary" size="300" radii="300">
            <Text size="B300">Invite Member</Text>
          </Button>

          {invitePrompt && (
            <InviteUserPrompt roomId={roomId} requestClose={() => setInvitePrompt(false)} />
          )}
          {typeof prevRoomId === 'string' && (
            <Button
              onClick={() => navigateRoom(prevRoomId)}
              variant="Secondary"
              size="300"
              fill="Soft"
              radii="300"
            >
              <Text size="B300">Open Old Room</Text>
            </Button>
          )}
        </Box>
      </Box>
    </Box>
  );
});
