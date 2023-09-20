import React from 'react';
import { Box, Icon, Icons, Text, as, config } from 'folds';
import { Room, RoomMember } from 'matrix-js-sdk';
import classNames from 'classnames';

import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './RoomViewFollowing.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomLatestEvent } from '../../hooks/useRoomLatestEvent';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';

export type RoomViewFollowingProps = {
  room: Room;
};
export const RoomViewFollowing = as<'div', RoomViewFollowingProps>(
  ({ className, room, ...props }, ref) => {
    const mx = useMatrixClient();
    const latestEvent = useRoomLatestEvent(room);
    const latestEventReaders = useRoomEventReaders(room, latestEvent?.getId());
    const followingMembers = latestEventReaders
      .map((readerId) => room.getMember(readerId))
      .filter((member) => member && member.userId !== mx.getUserId()) as RoomMember[];

    const names = followingMembers.map(
      (member) => getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId)
    );

    return (
      <Box
        className={classNames(css.RoomViewFollowing, className)}
        alignItems="Center"
        justifyContent="End"
        gap="200"
        {...props}
        ref={ref}
      >
        {names.length > 0 && (
          <>
            <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.CheckTwice} />
            <Text size="T300" truncate>
              {names.length === 1 && (
                <>
                  <b>{names[0]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' is following the conversation.'}
                  </Text>
                </>
              )}
              {names.length === 2 && (
                <>
                  <b>{names[0]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' and '}
                  </Text>
                  <b>{names[1]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' are following the conversation.'}
                  </Text>
                </>
              )}
              {names.length === 3 && (
                <>
                  <b>{names[0]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {', '}
                  </Text>
                  <b>{names[1]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' and '}
                  </Text>
                  <b>{names[2]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' are following the conversation.'}
                  </Text>
                </>
              )}
              {names.length > 3 && (
                <>
                  <b>{names[0]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {', '}
                  </Text>
                  <b>{names[1]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {', '}
                  </Text>
                  <b>{names[2]}</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' and '}
                  </Text>
                  <b>{names.length - 3} others</b>
                  <Text as="span" size="Inherit" priority="300">
                    {' are following the conversation.'}
                  </Text>
                </>
              )}
            </Text>
          </>
        )}
      </Box>
    );
  }
);
