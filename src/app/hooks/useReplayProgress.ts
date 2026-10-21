import { MatrixClient } from 'matrix-js-sdk';
import { useEffect, useState } from 'react';
import { getReplayState, REPLAY_EVENT, ReplayState } from '../../client/staged-replay';

/**
 * Progress of the staged start-up replay (client/staged-replay.ts): how many of
 * the saved chats the SDK has rebuilt so far. Seeded from the module state so a
 * component that mounts after the first events still sees the right numbers.
 */
export const useReplayProgress = (mx?: MatrixClient): ReplayState => {
  const [state, setState] = useState<ReplayState>(() => ({ ...getReplayState() }));

  useEffect(() => {
    if (!mx) return undefined;
    const sync = () => setState({ ...getReplayState() });
    sync();
    // custom event, outside the SDK's typed event map
    (mx as unknown as { on: (ev: string, h: () => void) => void }).on(REPLAY_EVENT, sync);
    return () => {
      (mx as unknown as { removeListener: (ev: string, h: () => void) => void }).removeListener(
        REPLAY_EVENT,
        sync
      );
    };
  }, [mx]);

  return state;
};
