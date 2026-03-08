import { Room } from 'matrix-js-sdk';
import React from 'react';
import { Box, Icon, Icons, Text } from 'folds';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';

type MemberSpeakingProps = {
  room: Room;
  speakers: Set<string>;
};
export function MemberSpeaking({ room, speakers }: MemberSpeakingProps) {
  const speakingNames = Array.from(speakers).map(
    (userId) => getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId
  );
  return (
    <Box alignItems="Center" gap="100">
      <Icon size="100" src={Icons.Phone} filled />
      <Text size="T200" truncate>
        {speakingNames.length === 1 && (
          <>
            <b>{speakingNames[0]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' is speaking...'}
            </Text>
          </>
        )}
        {speakingNames.length === 2 && (
          <>
            <b>{speakingNames[0]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' and '}
            </Text>
            <b>{speakingNames[1]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' are speaking...'}
            </Text>
          </>
        )}
        {speakingNames.length === 3 && (
          <>
            <b>{speakingNames[0]}</b>
            <Text as="span" size="Inherit" priority="300">
              {', '}
            </Text>
            <b>{speakingNames[1]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' and '}
            </Text>
            <b>{speakingNames[2]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' are speaking...'}
            </Text>
          </>
        )}
        {speakingNames.length > 3 && (
          <>
            <b>{speakingNames[0]}</b>
            <Text as="span" size="Inherit" priority="300">
              {', '}
            </Text>
            <b>{speakingNames[1]}</b>
            <Text as="span" size="Inherit" priority="300">
              {', '}
            </Text>
            <b>{speakingNames[2]}</b>
            <Text as="span" size="Inherit" priority="300">
              {' and '}
            </Text>
            <b>{speakingNames.length - 3} others</b>
            <Text as="span" size="Inherit" priority="300">
              {' are speaking...'}
            </Text>
          </>
        )}
      </Text>
    </Box>
  );
}
