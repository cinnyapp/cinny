import { createContext, useContext } from 'react';
import { MatrixClient } from 'matrix-js-sdk';

const MatrixClientContext = createContext<MatrixClient | null>(null);

export const MatrixClientProvider = MatrixClientContext.Provider;

export function useMatrixClient(): MatrixClient {
  const mx = useContext(MatrixClientContext);
  if (!mx) throw new Error('MatrixClient not initialized!');
  return mx;
}
