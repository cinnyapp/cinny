import { MatrixClient } from 'matrix-js-sdk';
import { useMemo, useRef } from 'react';
import { TYPING_TIMEOUT_MS } from '../state/typingMembers';

type TypingStatusUpdater = (typing: boolean) => void;

export const useTypingStatusUpdater = (mx: MatrixClient, roomId: string): TypingStatusUpdater => {
  const statusSentTsRef = useRef<number>(0);

  const sendTypingStatus: TypingStatusUpdater = useMemo(() => {
    statusSentTsRef.current = 0;
    return (typing) => {
      if (typing) {
        if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
          return;
        }

        mx.sendTyping(roomId, true, TYPING_TIMEOUT_MS);
        const sentTs = Date.now();
        statusSentTsRef.current = sentTs;

        // Don't believe server will timeout typing status;
        // Clear typing status after timeout if already not;
        setTimeout(() => {
          if (statusSentTsRef.current === sentTs) {
            mx.sendTyping(roomId, false, TYPING_TIMEOUT_MS);
            statusSentTsRef.current = 0;
          }
        }, TYPING_TIMEOUT_MS);
        return;
      }

      if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
        mx.sendTyping(roomId, false, TYPING_TIMEOUT_MS);
      }
      statusSentTsRef.current = 0;
    };
  }, [mx, roomId]);

  return sendTypingStatus;
};
