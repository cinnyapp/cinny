// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { createContext, useContext } from 'react';
import { ClientContext } from '../../client/context';

const ClientCtx = createContext<ClientContext | null>(null);

export const ClientContextProvider = ClientCtx.Provider;

export const useClient = (): ClientContext => {
  const ct = useContext(ClientCtx);

  if (ct === null) {
    throw new Error('Client Context is not provided!');
  }

  return ct;
};
