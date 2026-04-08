import { Room } from 'matrix-js-sdk';
import { useMemo } from 'react';
import i18next from 'i18next';
import { IPowerLevels } from './usePowerLevels';
import { useStateEvent } from './useStateEvent';
import { MemberPowerTag, StateEvent } from '../../types/matrix/room';

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
    name: i18next.t('roomSettings:powerTagGoku', { defaultValue: 'Goku' }),
    color: '#ff6a00',
  },
  150: {
    name: i18next.t('roomSettings:powerTagManager', { defaultValue: 'Manager' }),
    color: '#ff6a7f',
  },
  101: {
    name: i18next.t('roomSettings:powerTagFounder', { defaultValue: 'Founder' }),
    color: '#0000ff',
  },
  100: {
    name: i18next.t('roomSettings:powerTagAdmin', { defaultValue: 'Admin' }),
    color: '#0088ff',
  },
  50: {
    name: i18next.t('roomSettings:powerTagModerator', { defaultValue: 'Moderator' }),
    color: '#1fd81f',
  },
  0: {
    name: i18next.t('roomSettings:powerTagMember', { defaultValue: 'Member' }),
    color: '#91cfdf',
  },
  [-1]: {
    name: i18next.t('roomSettings:powerTagMuted', { defaultValue: 'Muted' }),
    color: '#888888',
  },
};

const generateFallbackTag = (powerLevelTags: PowerLevelTags, power: number): MemberPowerTag => {
  const highToLow = sortPowers(getPowers(powerLevelTags));

  const tagPower = highToLow.find((p) => p < power);
  const tag = typeof tagPower === 'number' ? powerLevelTags[tagPower] : undefined;

  return {
    name: tag
      ? `${tag.name} ${power}`
      : i18next.t('roomSettings:teamPowerTag', { power, defaultValue: 'Team {{power}}' }),
  };
};

export const usePowerLevelTags = (room: Room, powerLevels: IPowerLevels): PowerLevelTags => {
  const tagsEvent = useStateEvent(room, StateEvent.PowerLevelTags);

  const powerLevelTags: PowerLevelTags = useMemo(() => {
    const content = tagsEvent?.getContent<PowerLevelTags>();
    const powerToTags: PowerLevelTags = { ...content };

    const powers = getUsedPowers(powerLevels);
    Array.from(powers).forEach((power) => {
      if (powerToTags[power]?.name === undefined) {
        powerToTags[power] = DEFAULT_TAGS[power] ?? generateFallbackTag(DEFAULT_TAGS, power);
      }
    });

    return powerToTags;
  }, [powerLevels, tagsEvent]);

  return powerLevelTags;
};

export const getPowerLevelTag = (
  powerLevelTags: PowerLevelTags,
  powerLevel: number
): MemberPowerTag => {
  const tag: MemberPowerTag | undefined = powerLevelTags[powerLevel];
  return tag ?? generateFallbackTag(powerLevelTags, powerLevel);
};
