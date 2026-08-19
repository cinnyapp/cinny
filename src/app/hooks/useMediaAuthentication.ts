import { useSpecVersions } from './useSpecVersions';

export const useMediaAuthentication = (): boolean => {
  useSpecVersions(); // consumed only to trigger re-render on versions change

  // Media authentication is introduced in spec version 1.11.
  // Synapse advertises v1.11 support but does NOT enforce authenticated media
  // (require_auth_for_media is not set). Cinny's service worker is supposed to
  // inject the Bearer token into v1 authenticated media requests, but it
  // silently fails to do so in this deployment, causing 401s on every avatar /
  // media thumbnail / download. Since Synapse allows unauthenticated media,
  // force this off so Cinny uses legacy v3 media URLs that need no token.
  return false;
};
