import { useMemo } from 'react';
import { useClient } from './useClient';
import { useObservableValue } from './useObservableValue';

export const useDirectUsers = (): string[] => {
  const ct = useClient();
  const roomToSummary = useObservableValue(ct.roomToSummary);

  const users = useMemo(() => {
    const heroes = Array.from(roomToSummary.values()).flatMap(
      (summary) => summary['m.heroes'] ?? []
    );

    return Array.from(new Set(heroes));
  }, [roomToSummary]);

  return users;
};
