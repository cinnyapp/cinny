import { useMemo } from 'react';
import { ILoginFlow, IPasswordFlow, ISSOFlow, LoginFlow } from 'matrix-js-sdk/lib/@types/auth';

export const getSSOFlow = (loginFlows: LoginFlow[]): ISSOFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.sso' || flow.type === 'm.login.cas') as
    | ISSOFlow
    | undefined;

export const getPasswordFlow = (loginFlows: LoginFlow[]): IPasswordFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.password') as IPasswordFlow;
export const getTokenFlow = (loginFlows: LoginFlow[]): LoginFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.token') as ILoginFlow & {
    type: 'm.login.token';
  };

export type ParsedLoginFlows = {
  password?: LoginFlow;
  token?: LoginFlow;
  sso?: ISSOFlow;
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
