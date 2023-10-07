import React, { useMemo } from 'react';
import { Box, Icon, IconButton, Icons, Text, as } from 'folds';
import { Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import { useAtomValue, useSetAtom } from 'jotai';
import { roomIdToTypingMembersAtom, selectRoomTypingMembersAtom } from '../../state/typingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './RoomViewTyping.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';

export type RoomViewTypingProps = {
  room: Room;
};
export const RoomViewTyping = as<'div', RoomViewTypingProps>(
  ({ className, room, ...props }, ref) => {
    const setTypingMembers = useSetAtom(roomIdToTypingMembersAtom);
    const mx = useMatrixClient();
    const typingMembers = useAtomValue(
      useMemo(() => selectRoomTypingMembersAtom(room.roomId, roomIdToTypingMembersAtom), [room])
    );

    const typingNames = typingMembers
      .filter((member) => member.userId !== mx.getUserId())
      .map((member) => getMemberDisplayName(room, member.userId) ?? getMxIdLocalPart(member.userId))
      .reverse();

    if (typingNames.length === 0) {
      return null;
    }

    const handleDropAll = () => {
      // some homeserver does not timeout typing status
      // we have given option so user can drop their typing status
      typingMembers.forEach((member) =>
        setTypingMembers({
          type: 'DELETE',
          roomId: room.roomId,
          member,
        })
      );
    };

    return (
      <Box
        className={classNames(css.RoomViewTyping, className)}
        alignItems="Center"
        gap="400"
        {...props}
        ref={ref}
      >
        <TypingIndicator />
        <Text className={css.TypingText} size="T300" truncate>
          {typingNames.length === 1 && (
            <>
              <b>{typingNames[0]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' is typing...'}
              </Text>
            </>
          )}
          {typingNames.length === 2 && (
            <>
              <b>{typingNames[0]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' and '}
              </Text>
              <b>{typingNames[1]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' are typing...'}
              </Text>
            </>
          )}
          {typingNames.length === 3 && (
            <>
              <b>{typingNames[0]}</b>
              <Text as="span" size="Inherit" priority="300">
                {', '}
              </Text>
              <b>{typingNames[1]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' and '}
              </Text>
              <b>{typingNames[2]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' are typing...'}
              </Text>
            </>
          )}
          {typingNames.length > 3 && (
            <>
              <b>{typingNames[0]}</b>
              <Text as="span" size="Inherit" priority="300">
                {', '}
              </Text>
              <b>{typingNames[1]}</b>
              <Text as="span" size="Inherit" priority="300">
                {', '}
              </Text>
              <b>{typingNames[2]}</b>
              <Text as="span" size="Inherit" priority="300">
                {' and '}
              </Text>
              <b>{typingNames.length - 3} others</b>
              <Text as="span" size="Inherit" priority="300">
                {' are typing...'}
              </Text>
            </>
          )}
        </Text>
        <IconButton title="Drop Typing Status" size="300" radii="Pill" onClick={handleDropAll}>
          <Icon size="50" src={Icons.Cross} />
        </IconButton>
      </Box>
    );
  }
);
