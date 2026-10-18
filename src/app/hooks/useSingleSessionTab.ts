import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRootPath } from '../pages/pathUtils';
import { randomStr } from '../utils/common';

export const useSingleSessionTab = (userId?: string) => {
  const broadcast = useMemo(() => new BroadcastChannel('in.cinny.broadcast'), []);

  const tabId = useMemo(() => randomStr(), []);
  const navigate = useNavigate();

  useEffect(() => {
    const handleBroadcast = (event: MessageEvent) => {
      if (!userId) return;
      const { type, userId: messageUserId, tabId: messageTabId } = event.data ?? {};

      if (type === 'session-spawn' && messageUserId === userId && messageTabId !== tabId) {
        // Another tab opened the same session
        navigate(getRootPath());
      }
    };

    broadcast.addEventListener('message', handleBroadcast);

    if (userId) {
      broadcast.postMessage({
        type: 'session-spawn',
        userId,
        tabId,
      });
    }

    return () => {
      broadcast.removeEventListener('message', handleBroadcast);
    };
  }, [broadcast, userId, tabId, navigate]);
};
