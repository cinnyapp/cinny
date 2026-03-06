import React, { ReactNode, useCallback, useRef } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import {
  CallEmbedContextProvider,
  CallEmbedRefContextProvider,
  useCallHangupEvent,
  useCallThemeSync,
} from '../hooks/useCallEmbed';
import { callEmbedAtom } from '../state/callEmbed';
import { CallEmbed } from '../plugins/call';
import { useSelectedRoom } from '../hooks/router/useSelectedRoom';

function CallUtils({ embed }: { embed: CallEmbed }) {
  const setCallEmbed = useSetAtom(callEmbedAtom);

  useCallThemeSync(embed);
  useCallHangupEvent(
    embed,
    useCallback(() => {
      setCallEmbed(undefined);
    }, [setCallEmbed])
  );

  return null;
}

type CallEmbedProviderProps = {
  children?: ReactNode;
};
export function CallEmbedProvider({ children }: CallEmbedProviderProps) {
  const callEmbed = useAtomValue(callEmbedAtom);
  const callEmbedRef = useRef<HTMLDivElement>(null);

  const selectedRoom = useSelectedRoom();
  const callVisible = callEmbed && selectedRoom === callEmbed.room.roomId;

  return (
    <CallEmbedContextProvider value={callEmbed}>
      {callEmbed && <CallUtils embed={callEmbed} />}
      <CallEmbedRefContextProvider value={callEmbedRef}>{children}</CallEmbedRefContextProvider>
      <div
        data-call-embed-container
        style={{
          visibility: callVisible ? undefined : 'hidden',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '50%',
        }}
        ref={callEmbedRef}
      />
    </CallEmbedContextProvider>
  );
}
