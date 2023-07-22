import { useReducer } from 'react';

const reducer = (prevCount: number): number => prevCount + 1;

export const useForceUpdate = (): [number, () => void] => {
  const [state, dispatch] = useReducer<typeof reducer>(reducer, 0);

  return [state, dispatch];
};
