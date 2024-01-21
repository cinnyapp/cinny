import { useMemo } from 'react';
import { ILoginFlow, IPasswordFlow, ISSOFlow, LoginFlow } from 'matrix-js-sdk/lib/@types/auth';
import { WithRequiredProp } from '../../types/utils';

export type Required_SSOFlow = WithRequiredProp<ISSOFlow, 'identity_providers'>;
export const getSSOFlow = (loginFlows: LoginFlow[]): Required_SSOFlow | undefined =>
  loginFlows.find(
    (flow) =>
      (flow.type === 'm.login.sso' || flow.type === 'm.login.cas') &&
      'identity_providers' in flow &&
      Array.isArray(flow.identity_providers) &&
      flow.identity_providers.length > 0
  ) as Required_SSOFlow | undefined;

export const getPasswordFlow = (loginFlows: LoginFlow[]): IPasswordFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.password') as IPasswordFlow;
export const getTokenFlow = (loginFlows: LoginFlow[]): LoginFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.token') as ILoginFlow & {
    type: 'm.login.token';
  };

export type ParsedLoginFlows = {
  password?: LoginFlow;
  token?: LoginFlow;
  sso?: Required_SSOFlow;
};
export const useParsedLoginFlows = (loginFlows: LoginFlow[]) => {
  const parsedFlow: ParsedLoginFlows = useMemo<ParsedLoginFlows>(
    () => ({
      password: getPasswordFlow(loginFlows),
      token: getTokenFlow(loginFlows),
      sso: getSSOFlow(loginFlows),
    }),
    [loginFlows]
  );

  return parsedFlow;
};
