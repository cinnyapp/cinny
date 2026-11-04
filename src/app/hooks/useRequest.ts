/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { MatrixRequest } from 'neurone/lib/matrix-request';
import { createContext, useContext } from 'react';

const JSONRequestContext = createContext<MatrixRequest | null>(null);
export const JSONRequestProvider = JSONRequestContext.Provider;
export const useJSONRequest = (): MatrixRequest => {
  const request = useContext(JSONRequestContext);

  if (!request) throw new Error('JSON request is not provided!');

  return request;
};

const AuthJSONRequestContext = createContext<MatrixRequest | null>(null);
export const AuthJSONRequestProvider = AuthJSONRequestContext.Provider;
export const useAuthJSONRequest = (): MatrixRequest => {
  const request = useContext(AuthJSONRequestContext);

  if (!request) throw new Error('Auth JSON request is not provided!');

  return request;
};
