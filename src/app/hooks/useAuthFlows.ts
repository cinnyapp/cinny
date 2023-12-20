import { createContext, useContext } from 'react';
import { IAuthData } from 'matrix-js-sdk';
import { ILoginFlowsResponse } from 'matrix-js-sdk/lib/@types/auth';

export enum RegisterFlowStatus {
  FlowRequired = 401,
  InvalidRequest = 400,
  RegistrationDisabled = 403,
  RateLimited = 429,
}

export type RegisterFlowsResponse =
  | {
      status: RegisterFlowStatus.FlowRequired;
      data: IAuthData;
    }
  | {
      status: Exclude<RegisterFlowStatus, RegisterFlowStatus.FlowRequired>;
    };

export type AuthFlows = {
  loginFlows: ILoginFlowsResponse;
  registerFlows: RegisterFlowsResponse;
};

const AuthFlowsContext = createContext<AuthFlows | null>(null);

export const AuthFlowsProvider = AuthFlowsContext.Provider;

export const useAuthFlows = (): AuthFlows => {
  const authFlows = useContext(AuthFlowsContext);
  if (!authFlows) {
    throw new Error('Auth Flow info is not loaded!');
  }
  return authFlows;
};
