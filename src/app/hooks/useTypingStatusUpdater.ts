import { useMemo, useRef } from 'react';
import { putTyping } from 'neurone/lib/api/matrix/client/v3/rooms';
import { useClient } from './useClient';

const TYPING_TIMEOUT_MS = 5000; // 5 seconds

type TypingStatusUpdater = (typing: boolean) => void;

export const useTypingStatusUpdater = (roomId: string): TypingStatusUpdater => {
  const ct = useClient();
  const { userId } = ct.session;
  const statusSentTsRef = useRef<number>(0);

  const sendTypingStatus: TypingStatusUpdater = useMemo(() => {
    statusSentTsRef.current = 0;
    return (typing) => {
      if (typing) {
        if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
          return;
        }

        ct.requestAuthJSON(
          putTyping({
            pathParams: { roomId, userId },
            body: {
              typing: true,
              timeout: TYPING_TIMEOUT_MS,
            },
          })
        );

        const sentTs = Date.now();
        statusSentTsRef.current = sentTs;

        // Don't believe server will timeout typing status;
        // Clear typing status after timeout if already not;
        setTimeout(() => {
          if (statusSentTsRef.current === sentTs) {
            ct.requestAuthJSON(
              putTyping({
                pathParams: { roomId, userId },
                body: { typing: false },
              })
            );
            statusSentTsRef.current = 0;
          }
        }, TYPING_TIMEOUT_MS);
        return;
      }

      if (Date.now() - statusSentTsRef.current < TYPING_TIMEOUT_MS) {
        ct.requestAuthJSON(
          putTyping({
            pathParams: { roomId, userId },
            body: { typing: false },
          })
        );
      }
      statusSentTsRef.current = 0;
    };
  }, [ct, roomId, userId]);

  return sendTypingStatus;
};
