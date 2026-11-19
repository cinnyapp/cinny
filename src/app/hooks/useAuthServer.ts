/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { createContext, useContext } from 'react';

const AuthServerContext = createContext<string | null>(null);

export const AuthServerProvider = AuthServerContext.Provider;

export const useAuthServer = (): string => {
  const server = useContext(AuthServerContext);
  if (server === null) {
    throw new Error('Auth server is not provided!');
  }

  return server;
};
