import React, { useRef } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import {
  useCallEmbed,
  useCallJoined,
  useCallStart,
  useSyncCallEmbedPlacement,
} from '../../hooks/useCallEmbed';
import { ContainerColor } from '../../styles/ContainerColor.css';

export function CallView() {
  const room = useRoom();
  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const direct = useIsDirectRoom();

  const callViewRef = useRef<HTMLDivElement>(null);
  useSyncCallEmbedPlacement(callViewRef);

  const startCall = useCallStart(direct);
  const joining = callEmbed?.room.roomId === room.roomId && !callJoined;

  return (
    <Box
      ref={callViewRef}
      className={ContainerColor({ variant: 'Surface' })}
      grow="Yes"
      justifyContent="Center"
      alignItems="Center"
    >
      <Button
        variant="Success"
        onClick={() => startCall(room)}
        disabled={joining}
        before={<Icon src={Icons.ArrowRight} size="200" />}
      >
        <Text size="B400">Join</Text>
      </Button>
    </Box>
  );
}
