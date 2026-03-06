import React, { useCallback, useRef } from 'react';
import { Box, Button, Icon, Icons, Text } from 'folds';
import { useIsDirectRoom, useRoom } from '../../hooks/useRoom';
import {
  useCallEmbed,
  useCallEmbedRef,
  useCallJoined,
  useCallStart,
} from '../../hooks/useCallEmbed';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { ContainerColor } from '../../styles/ContainerColor.css';

export function CallView() {
  const room = useRoom();
  const callEmbed = useCallEmbed();
  const callJoined = useCallJoined(callEmbed);
  const direct = useIsDirectRoom();

  const callEmbedRef = useCallEmbedRef();
  const callViewRef = useRef<HTMLDivElement>(null);

  const startCall = useCallStart(direct);
  const joining = callEmbed?.room.roomId === room.roomId && !callJoined;

  const syncCallEmbedPlacement = useCallback(() => {
    const embedEl = callEmbedRef.current;
    const container = callViewRef.current;
    if (!embedEl || !container) return;

    embedEl.style.top = `${container.offsetTop}px`;
    embedEl.style.left = `${container.offsetLeft}px`;
    embedEl.style.width = `${container.clientWidth}px`;
    embedEl.style.height = `${container.clientHeight}px`;
  }, [callEmbedRef]);

  useResizeObserver(
    syncCallEmbedPlacement,
    useCallback(() => callViewRef.current, [])
  );

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
