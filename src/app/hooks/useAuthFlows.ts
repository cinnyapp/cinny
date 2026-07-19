import { createContext, useContext } from 'react';
import { MatrixError, MatrixErrorData } from 'neurone/lib/matrix-request';
import { GetLoginOK } from 'neurone/lib/api/matrix/client/v3/login';
import { AuthResponse } from '../utils/matrix-uia';

export enum RegisterFlowStatus {
  FlowRequired = 401,
  InvalidRequest = 400,
  RegistrationDisabled = 403,
  RateLimited = 429,
}

export type RegisterFlowsResponse =
  | {
      status: RegisterFlowStatus.FlowRequired;
      data: AuthResponse;
    }
  | {
      status: Exclude<RegisterFlowStatus, RegisterFlowStatus.FlowRequired>;
    };

export const parseRegisterErrResp = (
  matrixError: MatrixError<AuthResponse | MatrixErrorData>
): RegisterFlowsResponse => {
  switch (matrixError.status) {
    case RegisterFlowStatus.InvalidRequest: {
      return { status: RegisterFlowStatus.InvalidRequest };
    }
    case RegisterFlowStatus.RateLimited: {
      return { status: RegisterFlowStatus.RateLimited };
    }
    case RegisterFlowStatus.RegistrationDisabled: {
      return { status: RegisterFlowStatus.RegistrationDisabled };
    }
    case RegisterFlowStatus.FlowRequired: {
      return {
        status: RegisterFlowStatus.FlowRequired,
        data: matrixError.data as AuthResponse,
      };
    }
    default: {
      return { status: RegisterFlowStatus.InvalidRequest };
    }
  }
};

export type AuthFlows = {
  loginFlows: GetLoginOK;
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
