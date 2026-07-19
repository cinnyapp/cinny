import to from 'await-to-js';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { postLogin, PostLoginBody, PostLoginOK } from 'neurone/lib/api/matrix/client/v3/login';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { ClientConfig, clientAllowedServer } from '../../../hooks/useClientConfig';
import { autoDiscovery, specVersions } from '../../../cs-api';
import { ErrorCode } from '../../../cs-errorcode';
import {
  deleteAfterLoginRedirectPath,
  getAfterLoginRedirectPath,
} from '../../afterLoginRedirectPath';
import { getHomePath } from '../../pathUtils';
import { setFallbackSession } from '../../../state/sessions';
import { getJSONRequest } from '../../../../client/request';

export enum GetBaseUrlError {
  NotAllow = 'NotAllow',
  NotFound = 'NotFound',
}
export const factoryGetBaseUrl = (clientConfig: ClientConfig, server: string) => {
  const getBaseUrl = async (): Promise<string> => {
    if (!clientAllowedServer(clientConfig, server)) {
      throw new Error(GetBaseUrlError.NotAllow);
    }

    const [, discovery] = await to(autoDiscovery(fetch, server));

    let mxIdBaseUrl: string | undefined;
    const [, discoveryInfo] = discovery ?? [];

    if (discoveryInfo) {
      mxIdBaseUrl = discoveryInfo['m.homeserver'].base_url;
    }

    if (!mxIdBaseUrl) {
      throw new Error(GetBaseUrlError.NotFound);
    }
    const [, versions] = await to(specVersions(fetch, mxIdBaseUrl));
    if (!versions) {
      throw new Error(GetBaseUrlError.NotFound);
    }
    return mxIdBaseUrl;
  };
  return getBaseUrl;
};

export enum LoginError {
  ServerNotAllowed = 'ServerNotAllowed',
  InvalidServer = 'InvalidServer',
  Forbidden = 'Forbidden',
  UserDeactivated = 'UserDeactivated',
  InvalidRequest = 'InvalidRequest',
  RateLimited = 'RateLimited',
  Unknown = 'Unknown',
}

export type CustomLoginResponse = {
  baseUrl: string;
  response: PostLoginOK;
};
export const login = async (
  serverBaseUrl: string | (() => Promise<string>),
  body: PostLoginBody
): Promise<[LoginError, undefined] | [undefined, CustomLoginResponse]> => {
  const [urlError, url] =
    typeof serverBaseUrl === 'function' ? await to(serverBaseUrl()) : [undefined, serverBaseUrl];

  if (urlError) {
    return [
      urlError.message === GetBaseUrlError.NotAllow
        ? LoginError.ServerNotAllowed
        : LoginError.InvalidServer,
      undefined,
    ];
  }

  const requestJSON = getJSONRequest(url);
  const postLoginEndpoint = postLogin({ body });
  const response = await requestJSON(postLoginEndpoint);
  const [loginError, loginResult] = await parseMatrixResp<PostLoginOK>(response);

  if (loginError) {
    if (loginError.status === 400) {
      return [LoginError.InvalidRequest, undefined];
    }
    if (loginError.status === 429) {
      return [LoginError.RateLimited, undefined];
    }
    if (loginError.data.errcode === ErrorCode.M_USER_DEACTIVATED) {
      return [LoginError.UserDeactivated, undefined];
    }

    if (loginError.status === 403) {
      return [LoginError.Forbidden, undefined];
    }

    return [LoginError.Unknown, undefined];
  }
  return [
    undefined,
    {
      baseUrl: url,
      response: loginResult,
    },
  ];
};

export const useLoginComplete = (data?: CustomLoginResponse) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (data) {
      const { response: loginRes, baseUrl: loginBaseUrl } = data;
      setFallbackSession(loginRes.access_token, loginRes.device_id, loginRes.user_id, loginBaseUrl);
      const afterLoginRedirectUrl = getAfterLoginRedirectPath();
      deleteAfterLoginRedirectPath();
      navigate(afterLoginRedirectUrl ?? getHomePath(), { replace: true });
    }
  }, [data, navigate]);
};
