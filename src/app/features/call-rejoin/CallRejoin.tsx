import { useEffect, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { CallEmbed } from '../../plugins/call';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useCallStart } from '../../hooks/useCallEmbed';
import { useLivekitSupport } from '../../hooks/useLivekitSupport';
import { mDirectAtom } from '../../state/mDirectList';
import { webRTCSupported } from '../../utils/rtc';
import { Membership } from '../../../types/matrix/room';
import { REJOIN_KEY, REJOIN_WINDOW_MS, parseRejoin, serializeRejoin } from './savedCall';

const takeSaved = (): string | null => {
  try {
    const raw = sessionStorage.getItem(REJOIN_KEY);
    sessionStorage.removeItem(REJOIN_KEY);
    return raw;
  } catch {
    return null;
  }
};

type CallRejoinProps = {
  callEmbed?: CallEmbed;
  joined: boolean;
};

// Like Discord: reload the page during a call and you're back in it, on whatever page you were.
// The call is saved when the page goes away (only if you were in one) and used once on load.
export function CallRejoin({ callEmbed, joined }: CallRejoinProps) {
  const mx = useMatrixClient();
  const directs = useAtomValue(mDirectAtom);
  const livekitSupported = useLivekitSupport();
  const [pending] = useState(() => parseRejoin(takeSaved(), mx.getSafeUserId()));
  const startCall = useCallStart(pending ? directs.has(pending.roomId) : false);
  const started = useRef(false);

  const inCall = useRef<CallEmbed>();
  inCall.current = joined ? callEmbed : undefined;

  useEffect(() => {
    const onPageHide = () => {
      const embed = inCall.current;
      try {
        if (!embed) {
          sessionStorage.removeItem(REJOIN_KEY);
          return;
        }
        sessionStorage.setItem(
          REJOIN_KEY,
          serializeRejoin({
            userId: mx.getSafeUserId(),
            roomId: embed.roomId,
            at: Date.now(),
            microphone: embed.control.microphone,
            video: embed.control.video,
            sound: embed.control.sound,
          })
        );
      } catch {
        // storage unavailable: no rejoin after reload
      }
    };
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [mx]);

  useEffect(() => {
    if (!pending || started.current) return;
    // The call server is learned from /.well-known a moment after load: wait for it.
    if (!livekitSupported || !webRTCSupported()) return;
    started.current = true;
    if (callEmbed || Date.now() - pending.at > REJOIN_WINDOW_MS) return;
    const room = mx.getRoom(pending.roomId);
    if (!room || room.getMyMembership() !== Membership.Join) return;
    try {
      startCall(room, {
        microphone: pending.microphone,
        video: pending.video,
        sound: pending.sound,
      });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("Couldn't rejoin the call", e);
    }
  }, [mx, pending, startCall, livekitSupported, callEmbed]);

  return null;
}
