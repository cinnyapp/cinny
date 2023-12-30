import { ReactNode, useCallback, useEffect, useMemo } from 'react';
import { IAuthData, MatrixError, createClient } from 'matrix-js-sdk';
import { AsyncStatus, useAsyncCallback } from '../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../hooks/useAutoDiscoveryInfo';
import { promiseFulfilledResult, promiseRejectedResult } from '../utils/common';
import { AuthFlows, RegisterFlowStatus, RegisterFlowsResponse } from '../hooks/useAuthFlows';

type AuthFlowsLoaderProps = {
  fallback?: () => ReactNode;
  error?: (err: unknown) => ReactNode;
  children: (authFlows: AuthFlows) => ReactNode;
};
export function AuthFlowsLoader({ fallback, error, children }: AuthFlowsLoaderProps) {
  const autoDiscoveryInfo = useAutoDiscoveryInfo();
  const baseUrl = autoDiscoveryInfo['m.homeserver'].base_url;

  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const [state, load] = useAsyncCallback(
    useCallback(async () => {
      const result = await Promise.allSettled([mx.loginFlows(), mx.registerRequest({})]);
      const loginFlows = promiseFulfilledResult(result[0]);
      const registerReason = promiseRejectedResult(result[1]) as MatrixError | undefined;
      let registerFlows: RegisterFlowsResponse = { status: RegisterFlowStatus.InvalidRequest };

      if (typeof registerReason === 'object' && registerReason.httpStatus) {
        switch (registerReason.httpStatus) {
          case RegisterFlowStatus.InvalidRequest: {
            registerFlows = { status: RegisterFlowStatus.InvalidRequest };
            break;
          }
          case RegisterFlowStatus.RateLimited: {
            registerFlows = { status: RegisterFlowStatus.RateLimited };
            break;
          }
          case RegisterFlowStatus.RegistrationDisabled: {
            registerFlows = { status: RegisterFlowStatus.RegistrationDisabled };
            break;
          }
          case RegisterFlowStatus.FlowRequired: {
            registerFlows = {
              status: RegisterFlowStatus.FlowRequired,
              data: registerReason.data as IAuthData,
            };
            break;
          }
          default: {
            registerFlows = { status: RegisterFlowStatus.InvalidRequest };
          }
        }
      }

      if (!loginFlows) {
        throw new Error('Missing auth flow!');
      }
      if ('errcode' in loginFlows) {
        throw new Error('Failed to load auth flow!');
      }

      const authFlows: AuthFlows = {
        loginFlows,
        registerFlows,
      };

      return authFlows;
    }, [mx])
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
