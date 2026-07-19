import { createContext, useContext } from 'react';

const SpaceContext = createContext<string | null>(null);

export const SpaceProvider = SpaceContext.Provider;

export function useSpace(): string {
  const space = useContext(SpaceContext);
  if (!space) throw new Error('Space not provided!');
  return space;
}

export function useSpaceOptionally(): string | undefined {
  const space = useContext(SpaceContext);
  return space ?? undefined;
}
