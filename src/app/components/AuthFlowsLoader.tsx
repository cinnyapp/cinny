import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { getLogin, GetLoginOK } from 'neurone/lib/api/matrix/client/v3/login';
import { postRegister } from 'neurone/lib/api/matrix/client/v3/register';
import { MatrixErrorData, parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../hooks/useAutoDiscoveryInfo';
import { promiseFulfilledResult } from '../utils/common';
import {
  AuthFlows,
  RegisterFlowStatus,
  RegisterFlowsResponse,
  parseRegisterErrResp,
} from '../hooks/useAuthFlows';
import { getJSONRequest } from '../../client/request';
import { AuthResponse } from '../utils/matrix-uia';

type AuthFlowsLoaderProps = {
  fallback?: () => ReactNode;
  error?: (err: unknown) => ReactNode;
  children: (authFlows: AuthFlows) => ReactNode;
};
export function AuthFlowsLoader({ fallback, error, children }: AuthFlowsLoaderProps) {
  const autoDiscoveryInfo = useAutoDiscoveryInfo();
  const baseUrl = autoDiscoveryInfo['m.homeserver'].base_url;

  const requestJSON = useMemo(() => getJSONRequest(baseUrl), [baseUrl]);

  const [state, load] = useAsyncCallback(
    useCallback(async () => {
      const loginEndpoint = getLogin({});
      const registerEndpoint = postRegister({});

      const [loginResponse, registerResponse] = (
        await Promise.allSettled([requestJSON(loginEndpoint), requestJSON(registerEndpoint)])
      ).map(promiseFulfilledResult);

      let registerFlows: RegisterFlowsResponse = { status: RegisterFlowStatus.InvalidRequest };
      const [registerError] =
        typeof registerResponse === 'object'
          ? await parseMatrixResp<undefined, AuthResponse | MatrixErrorData>(registerResponse)
          : [];

      if (registerError) {
        registerFlows = parseRegisterErrResp(registerError);
      }

      if (!loginResponse) {
        throw new Error('Missing auth flow!');
      }
      const [loginError, loginFlows] = await parseMatrixResp<GetLoginOK>(loginResponse);
      if (loginError) {
        throw new Error(`Failed to load auth flow! ${printMatrixError(loginError)}`);
      }

      const authFlows: AuthFlows = {
        loginFlows,
        registerFlows,
      };

      return authFlows;
    }, [requestJSON])
  );

  useEffect(() => {
    load();
  }, [load]);

  if (state.status === AsyncStatus.Idle || state.status === AsyncStatus.Loading) {
    return fallback?.();
  }

  if (state.status === AsyncStatus.Error) {
    return error?.(state.error);
  }

  return children(state.data);
}
