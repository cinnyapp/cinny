import { useCallback, useMemo } from 'react';

export type PowerLevelTag = {
  name: string;
};
export const usePowerLevelTags = () => {
  const powerLevelTags = useMemo(
    () => ({
      9000: {
        name: 'Goku',
      },
      101: {
        name: 'Founder',
      },
      100: {
        name: 'Admin',
      },
      50: {
        name: 'Moderator',
      },
      0: {
        name: 'Default',
      },
    }),
    []
  );

  return useCallback(
    (powerLevel: number): PowerLevelTag => {
      if (powerLevel >= 9000) return powerLevelTags[9000];
      if (powerLevel >= 101) return powerLevelTags[101];
      if (powerLevel === 100) return powerLevelTags[100];
      if (powerLevel >= 50) return powerLevelTags[50];
      return powerLevelTags[0];
    },
    [powerLevelTags]
  );
};
