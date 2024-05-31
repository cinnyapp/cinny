import to from 'await-to-js';
import { trimTrailingSlash } from './utils/common';

export enum AutoDiscoveryAction {
  PROMPT = 'PROMPT',
  IGNORE = 'IGNORE',
  FAIL_PROMPT = 'FAIL_PROMPT',
  FAIL_ERROR = 'FAIL_ERROR',
}

export type AutoDiscoveryError = {
  host: string;
  action: AutoDiscoveryAction;
};

export type AutoDiscoveryInfo = Record<string, unknown> & {
  'm.homeserver': {
    base_url: string;
  };
  'm.identity_server'?: {
    base_url: string;
  };
};

export const autoDiscovery = async (
  request: typeof fetch,
  server: string
): Promise<[AutoDiscoveryError, undefined] | [undefined, AutoDiscoveryInfo]> => {
  const host = /^https?:\/\//.test(server) ? trimTrailingSlash(server) : `https://${server}`;
  const autoDiscoveryUrl = `${host}/.well-known/matrix/client`;

  const [err, response] = await to(request(autoDiscoveryUrl, { method: 'GET' }));

  if (err || response.status === 404) {
    // AutoDiscoveryAction.IGNORE
    // We will use default value for IGNORE action
    return [
      undefined,
      {
        'm.homeserver': {
          base_url: host,
        },
      },
    ];
  }
  if (response.status !== 200) {
    return [
      {
        host,
        action: AutoDiscoveryAction.FAIL_PROMPT,
      },
      undefined,
    ];
  }

  const [contentErr, content] = await to<AutoDiscoveryInfo>(response.json());

  if (contentErr || typeof content !== 'object') {
    return [
      {
        host,
        action: AutoDiscoveryAction.FAIL_PROMPT,
      },
      undefined,
    ];
  }

  const baseUrl = content['m.homeserver']?.base_url;
  if (typeof baseUrl !== 'string') {
    return [
      {
        host,
        action: AutoDiscoveryAction.FAIL_PROMPT,
      },
      undefined,
    ];
  }

  if (/^https?:\/\//.test(baseUrl) === false) {
    return [
      {
        host,
        action: AutoDiscoveryAction.FAIL_ERROR,
      },
      undefined,
    ];
  }

  content['m.homeserver'].base_url = trimTrailingSlash(baseUrl);
  if (content['m.identity_server']) {
    content['m.identity_server'].base_url = trimTrailingSlash(
      content['m.identity_server'].base_url
    );
  }

  return [undefined, content];
};

export type SpecVersions = {
  versions: string[];
  unstable_features?: Record<string, boolean>;
};
export const specVersions = async (
  request: typeof fetch,
  baseUrl: string
): Promise<SpecVersions> => {
  const res = await request(`${trimTrailingSlash(baseUrl)}/_matrix/client/versions`);

  const data = (await res.json()) as unknown;

  if (data && typeof data === 'object' && 'versions' in data && Array.isArray(data.versions)) {
    return data as SpecVersions;
  }
  throw new Error('Homeserver URL does not appear to be a valid Matrix homeserver');
};
