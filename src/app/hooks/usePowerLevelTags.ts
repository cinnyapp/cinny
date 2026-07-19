import { createContext, useContext, useMemo } from 'react';
import { PendingObservableResult } from 'neurone/lib/utils/observable';
import { IPowerLevels } from './usePowerLevels';
import { MemberPowerTag, StateEventType } from '../../types/matrix/room';
import { getJoinRoomStateId, JoinRoomStateObject } from '../../client/storage/collections';
import { useClient } from './useClient';
import { useObservableValuePromise } from './useObservableValue';

export type PowerLevelTags = Record<number, MemberPowerTag>;

const powerSortFn = (a: number, b: number) => b - a;
const sortPowers = (powers: number[]): number[] => powers.sort(powerSortFn);

export const getPowers = (tags: PowerLevelTags): number[] => {
  const powers: number[] = Object.keys(tags)
    .map((p) => {
      const power = parseInt(p, 10);
      if (Number.isNaN(power)) {
        return undefined;
      }
      return power;
    })
    .filter((power) => typeof power === 'number');

  return sortPowers(powers);
};

export const getUsedPowers = (powerLevels: IPowerLevels): Set<number> => {
  const powers: Set<number> = new Set();

  const findAndAddPower = (data: Record<string, unknown>) => {
    Object.keys(data).forEach((key) => {
      const powerOrAny: unknown = data[key];

      if (typeof powerOrAny === 'number') {
        powers.add(powerOrAny);
        return;
      }
      if (powerOrAny && typeof powerOrAny === 'object') {
        findAndAddPower(powerOrAny as Record<string, unknown>);
      }
    });
  };

  findAndAddPower(powerLevels);

  return powers;
};

const DEFAULT_TAGS: PowerLevelTags = {
  9001: {
    name: 'Goku',
    color: '#ff6a00',
  },
  150: {
    name: 'Manager',
    color: '#ff6a7f',
  },
  101: {
    name: 'Founder',
    color: '#0000ff',
  },
  100: {
    name: 'Admin',
    color: '#0088ff',
  },
  50: {
    name: 'Moderator',
    color: '#1fd81f',
  },
  0: {
    name: 'Member',
    color: '#91cfdf',
  },
  [-1]: {
    name: 'Muted',
    color: '#888888',
  },
};

const generateFallbackTag = (powerLevelTags: PowerLevelTags, power: number): MemberPowerTag => {
  const highToLow = sortPowers(getPowers(powerLevelTags));

  const tagPower = highToLow.find((p) => p < power);
  const tag = typeof tagPower === 'number' ? powerLevelTags[tagPower] : undefined;

  return {
    name: tag ? `${tag.name} ${power}` : `Team ${power}`,
  };
};

export function usePowerLevelTagsState(
  roomId: string
): PendingObservableResult<JoinRoomStateObject | undefined> {
  const ct = useClient();

  const eventObservablePromise = useMemo(
    () =>
      ct.storage.joinRoomState.observableRead.get(
        getJoinRoomStateId(roomId, StateEventType.PowerLevelTags, '')
      ),
    [ct, roomId]
  );

  return useObservableValuePromise(eventObservablePromise);
}

const PowerLevelTagsContext = createContext<PowerLevelTags | null>(null);

export const PowerLevelTagsContextProvider = PowerLevelTagsContext.Provider;

export const usePowerLevelTagsContext = (): PowerLevelTags => {
  const tags = useContext(PowerLevelTagsContext);
  if (!tags) throw new Error('PowerLevelTagsContext is not initialized!');
  return tags;
};

export const usePowerLevelTags = (
  powerLevels: IPowerLevels,
  eventObj: JoinRoomStateObject | undefined
): PowerLevelTags => {
  const powerLevelTags: PowerLevelTags = useMemo(() => {
    const { content } = eventObj?.event ?? {};
    const powerToTags: PowerLevelTags = { ...content };

    const powers = getUsedPowers(powerLevels);
    Array.from(powers).forEach((power) => {
      if (powerToTags[power]?.name === undefined) {
        powerToTags[power] = DEFAULT_TAGS[power] ?? generateFallbackTag(DEFAULT_TAGS, power);
      }
    });

    return powerToTags;
  }, [powerLevels, eventObj]);

  return powerLevelTags;
};

export const getPowerLevelTag = (
  powerLevelTags: PowerLevelTags,
  powerLevel: number
): MemberPowerTag => {
  const tag: MemberPowerTag | undefined = powerLevelTags[powerLevel];
  return tag ?? generateFallbackTag(powerLevelTags, powerLevel);
};
