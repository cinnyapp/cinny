import { useState, useEffect } from 'react';
import { useSpecVersions } from './useSpecVersions';

/**
 * Whether the Cinny service worker is actively controlling this page and
 * therefore able to inject the Bearer access token into authenticated v1
 * media requests (/_matrix/client/v1/media/download|thumbnail). Browsers
 * only register service workers in secure contexts (HTTPS or localhost), so
 * on a plain-HTTP LAN URL like http://10.1.0.220:8083 the SW never registers
 * and there is no controller. Without a controller the SW cannot add the
 * Authorization header, so authenticated v1 media URLs get 401s from Synapse
 * and nothing (avatars, thumbnails, stickers) renders.
 */
function useServiceWorkerActive(): boolean {
  const [active, setActive] = useState(() =>
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    !!navigator.serviceWorker.controller
  );

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
      return undefined;
    }

    const update = () => setActive(!!navigator.serviceWorker.controller);
    update();

    navigator.serviceWorker.addEventListener('controllerchange', update);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', update);
  }, []);

  return active;
}

export const useMediaAuthentication = (): boolean => {
  const { versions, unstable_features: unstableFeatures } = useSpecVersions();
  const swActive = useServiceWorkerActive();

  // Media authentication (MSC3916) is introduced in spec version 1.11.
  const serverSupportsAuthenticatedMedia =
    unstableFeatures?.['org.matrix.msc3916.stable'] || versions.includes('v1.11');

  // Only request authenticated v1 media URLs when the server supports them
  // AND the service worker is actively controlling the page (so it can inject
  // the Bearer token). If the SW is not controlling — e.g. on a plain-HTTP
  // non-localhost LAN URL where the browser refuses to register a service
  // worker — fall back to legacy v3 media URLs that need no token.
  return serverSupportsAuthenticatedMedia && swActive;
};