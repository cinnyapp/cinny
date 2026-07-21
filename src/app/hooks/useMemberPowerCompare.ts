import { useCallback } from 'react';
import { IPowerLevels, readPowerLevel } from './usePowerLevels';

export const useMemberPowerCompare = (
  creators: Set<string> | undefined,
  powerLevels: IPowerLevels
) => {
  /**
   * returns `true` if `userIdA` has more power than `userIdB`
   * returns `false` otherwise
   */
  const hasMorePower = useCallback(
    (userIdA: string, userIdB: string): boolean => {
      const aIsCreator = creators?.has(userIdA);
      const bIsCreator = creators?.has(userIdB);
      if (aIsCreator && bIsCreator) return false;
      if (aIsCreator) return true;
      if (bIsCreator) return false;

      const aPower = readPowerLevel.user(powerLevels, userIdA);
      const bPower = readPowerLevel.user(powerLevels, userIdB);

      return aPower > bPower;
    },
    [creators, powerLevels]
  );

  return {
    hasMorePower,
  };
};
