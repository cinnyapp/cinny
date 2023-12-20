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
