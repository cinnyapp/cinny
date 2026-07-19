import React from 'react';
import { Box, Icon, IconButton, Icons, Text, as } from 'folds';
import classNames from 'classnames';
import { useSetAtom } from 'jotai';
import { roomIdToTypingMembersAtom } from '../../state/typingMembers';
import { TypingIndicator } from '../../components/typing-indicator';
import * as css from './RoomViewTyping.css';
import { useRoomTypingMember } from '../../hooks/useRoomTypingMembers';
import { useRoom } from '../../hooks/useRoom';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { useClient } from '../../hooks/useClient';

export const RoomViewTyping = as<'div'>(({ className, ...props }, ref) => {
  const ct = useClient();
  const roomId = useRoom();
  const membersAPI = useRoomMembersAPI();

  const setTypingMembers = useSetAtom(roomIdToTypingMembersAtom);
  const typingMembers = useRoomTypingMember(roomId);

  const typingNames = typingMembers
    .filter((userId) => userId !== ct.session.userId)
    .map((userId) => membersAPI.getName(userId))
    .reverse();

  if (typingNames.length === 0) {
    return null;
  }

  const handleDropAll = () => {
    setTypingMembers(new Map());
  };

  return (
    <div style={{ position: 'relative' }}>
      <Box
        className={classNames(css.RoomViewTyping, className)}
        alignItems="Center"
        gap="400"
        {...props}
        ref={ref}
      >
        <TypingIndicator />
        <Text className={css.TypingText} size="T300" truncate>
          {/* {typingNames.length === 0 && <b>No one is typing...</b>} */}
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
        <IconButton
          title="Drop Typing Status"
          size="300"
          fill="None"
          radii="Pill"
          onClick={handleDropAll}
        >
          <Icon size="50" src={Icons.Cross} />
        </IconButton>
      </Box>
    </div>
  );
});
