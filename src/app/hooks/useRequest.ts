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
