import { Room } from 'matrix-js-sdk';
import { createContext, useCallback, useContext, useMemo } from 'react';
import { useStateEvent } from './useStateEvent';
import { StateEvent } from '../../types/matrix/room';
import { useForceUpdate } from './useForceUpdate';
import { useStateEventCallback } from './useStateEventCallback';
import { useMatrixClient } from './useMatrixClient';
import { getStateEvent } from '../utils/room';

export type PowerLevelActions = 'invite' | 'redact' | 'kick' | 'ban' | 'historical';

enum DefaultPowerLevels {
  usersDefault = 0,
  stateDefault = 50,
  eventsDefault = 0,
  invite = 0,
  redact = 50,
  kick = 50,
  ban = 50,
  historical = 0,
}

export interface IPowerLevels {
  users_default?: number;
  state_default?: number;
  events_default?: number;
  historical?: number;
  invite?: number;
  redact?: number;
  kick?: number;
  ban?: number;

  events?: Record<string, number>;
  users?: Record<string, number>;
  notifications?: Record<string, number>;
}

export function usePowerLevels(room: Room): IPowerLevels {
  const powerLevelsEvent = useStateEvent(room, StateEvent.RoomPowerLevels);
  const powerLevels: IPowerLevels =
    powerLevelsEvent?.getContent<IPowerLevels>() ?? DefaultPowerLevels;

  return powerLevels;
}

export const PowerLevelsContext = createContext<IPowerLevels | null>(null);

export const PowerLevelsContextProvider = PowerLevelsContext.Provider;

export const usePowerLevelsContext = (): IPowerLevels => {
  const pl = useContext(PowerLevelsContext);
  if (!pl) throw new Error('PowerLevelContext is not initialized!');
  return pl;
};

export const useRoomsPowerLevels = (rooms: Room[]): Map<string, IPowerLevels> => {
  const mx = useMatrixClient();
  const [updateCount, forceUpdate] = useForceUpdate();

  useStateEventCallback(
    mx,
    useCallback(
      (event) => {
        const roomId = event.getRoomId();
        if (
          roomId &&
          event.getType() === StateEvent.RoomPowerLevels &&
          event.getStateKey() === '' &&
          rooms.find((r) => r.roomId === roomId)
        ) {
          forceUpdate();
        }
      },
      [rooms, forceUpdate]
    )
  );

  const roomToPowerLevels = useMemo(
    () => {
      const rToPl = new Map<string, IPowerLevels>();

      rooms.forEach((room) => {
        const pl = getStateEvent(room, StateEvent.RoomPowerLevels, '')?.getContent<IPowerLevels>();
        if (pl) rToPl.set(room.roomId, pl);
      });

      return rToPl;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rooms, updateCount]
  );

  return roomToPowerLevels;
};

export type GetPowerLevel = (powerLevels: IPowerLevels, userId: string | undefined) => number;
export type CanSend = (
  powerLevels: IPowerLevels,
  eventType: string | undefined,
  powerLevel: number
) => boolean;
export type CanDoAction = (
  powerLevels: IPowerLevels,
  action: PowerLevelActions,
  powerLevel: number
) => boolean;

export type PowerLevelsAPI = {
  getPowerLevel: GetPowerLevel;
  canSendEvent: CanSend;
  canSendStateEvent: CanSend;
  canDoAction: CanDoAction;
};

export const powerLevelAPI: PowerLevelsAPI = {
  getPowerLevel: (powerLevels, userId) => {
    const { users_default: usersDefault, users } = powerLevels;
    if (userId && users && typeof users[userId] === 'number') {
      return users[userId];
    }
    return usersDefault ?? DefaultPowerLevels.usersDefault;
  },
  canSendEvent: (powerLevels, eventType, powerLevel) => {
    const { events, events_default: eventsDefault } = powerLevels;
    if (events && eventType && typeof events[eventType] === 'number') {
      return powerLevel >= events[eventType];
    }
    return powerLevel >= (eventsDefault ?? DefaultPowerLevels.eventsDefault);
  },
  canSendStateEvent: (powerLevels, eventType, powerLevel) => {
    const { events, state_default: stateDefault } = powerLevels;
    if (events && eventType && typeof events[eventType] === 'number') {
      return powerLevel >= events[eventType];
    }
    return powerLevel >= (stateDefault ?? DefaultPowerLevels.stateDefault);
  },
  canDoAction: (powerLevels, action, powerLevel) => {
    const requiredPL = powerLevels[action];
    if (typeof requiredPL === 'number') {
      return powerLevel >= requiredPL;
    }
    return powerLevel >= DefaultPowerLevels[action];
  },
};

export const usePowerLevelsAPI = (powerLevels: IPowerLevels) => {
  const getPowerLevel = useCallback(
    (userId: string | undefined) => powerLevelAPI.getPowerLevel(powerLevels, userId),
    [powerLevels]
  );

  const canSendEvent = useCallback(
    (eventType: string | undefined, powerLevel: number) =>
      powerLevelAPI.canSendEvent(powerLevels, eventType, powerLevel),
    [powerLevels]
  );

  const canSendStateEvent = useCallback(
    (eventType: string | undefined, powerLevel: number) =>
      powerLevelAPI.canSendStateEvent(powerLevels, eventType, powerLevel),
    [powerLevels]
  );

  const canDoAction = useCallback(
    (action: PowerLevelActions, powerLevel: number) =>
      powerLevelAPI.canDoAction(powerLevels, action, powerLevel),
    [powerLevels]
  );

  return {
    getPowerLevel,
    canSendEvent,
    canSendStateEvent,
    canDoAction,
  };
};
