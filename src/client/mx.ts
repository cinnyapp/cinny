import { MatrixClient } from 'matrix-js-sdk';
import initMatrix from './initMatrix';

export const mx = (): MatrixClient => {
  if (!initMatrix.matrixClient) console.error('Matrix client is used before initialization!');
  return initMatrix.matrixClient!;
};
