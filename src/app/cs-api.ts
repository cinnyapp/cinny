import to from 'await-to-js';

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
  const host = /^https?:\/\//.test(server) ? server : `https://${server}`;
  const autoDiscoveryUrl = `${host}/.well-known/matrix/client`;

  const [err, response] = await to(request(autoDiscoveryUrl, { method: 'GET' }));

  if (err || response.status === 404) {
    return [
      {
        host,
        action: AutoDiscoveryAction.IGNORE,
      },
      undefined,
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
  const res = await request(`${baseUrl}/_matrix/client/versions`);

  const data = (await res.json()) as unknown;

  if (data && typeof data === 'object' && 'versions' in data && Array.isArray(data.versions)) {
    return data as SpecVersions;
  }
  throw new Error('Homeserver URL does not appear to be a valid Matrix homeserver');
};
