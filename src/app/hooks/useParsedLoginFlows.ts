/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useMemo } from 'react';
import { LoginFlow } from 'neurone/lib/api/types';

const getSSOFlow = (loginFlows: LoginFlow[]): LoginFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.sso' || flow.type === 'm.login.cas');

const getPasswordFlow = (loginFlows: LoginFlow[]): LoginFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.password');

const getTokenFlow = (loginFlows: LoginFlow[]): LoginFlow | undefined =>
  loginFlows.find((flow) => flow.type === 'm.login.token');

export type ParsedLoginFlows = {
  password?: LoginFlow;
  token?: LoginFlow;
  sso?: LoginFlow;
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
