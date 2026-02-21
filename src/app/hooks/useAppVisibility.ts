import { useEffect } from 'react';
import { MatrixClient } from 'matrix-js-sdk';
import { useAtom } from 'jotai';
import { togglePusher } from '../features/settings/notifications/PushNotifications';
import { appEvents } from '../utils/appEvents';
import { useClientConfig } from './useClientConfig';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';
import { pushSubscriptionAtom } from '../state/pushSubscription';

export function useAppVisibility(mx: MatrixClient | undefined) {
  const clientConfig = useClientConfig();
  const [usePushNotifications] = useSetting(settingsAtom, 'usePushNotifications');
  const pushSubAtom = useAtom(pushSubscriptionAtom);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      appEvents.onVisibilityChange?.(isVisible);
      if (!isVisible) {
        appEvents.onVisibilityHidden?.();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    if (!mx) return;

    const handleVisibilityForNotifications = (isVisible: boolean) => {
      togglePusher(mx, clientConfig, isVisible, usePushNotifications, pushSubAtom);
    };

    appEvents.onVisibilityChange = handleVisibilityForNotifications;
    // eslint-disable-next-line consistent-return
    return () => {
      appEvents.onVisibilityChange = null;
    };
  }, [mx, clientConfig, usePushNotifications, pushSubAtom]);
}
