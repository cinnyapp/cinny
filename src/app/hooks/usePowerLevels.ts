import { Room } from 'matrix-js-sdk';
import { createContext, useCallback, useContext } from 'react';
import { useStateEvent } from './useStateEvent';
import { StateEvent } from '../../types/matrix/room';

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

interface IPowerLevels {
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

export type GetPowerLevel = (userId: string) => number;
export type CanSend = (eventType: string | undefined, powerLevel: number) => boolean;
export type CanDoAction = (action: PowerLevelActions, powerLevel: number) => boolean;

export type PowerLevelsAPI = {
  getPowerLevel: GetPowerLevel;
  canSendEvent: CanSend;
  canSendStateEvent: CanSend;
  canDoAction: CanDoAction;
};

export function usePowerLevels(room: Room): PowerLevelsAPI {
  const powerLevelsEvent = useStateEvent(room, StateEvent.RoomPowerLevels);
  const powerLevels: IPowerLevels = powerLevelsEvent?.getContent() ?? DefaultPowerLevels;

  const getPowerLevel: GetPowerLevel = useCallback(
    (userId) => {
      const { users_default: usersDefault, users } = powerLevels;
      if (users && typeof users[userId] === 'number') {
        return users[userId];
      }
      return usersDefault ?? DefaultPowerLevels.usersDefault;
    },
    [powerLevels]
  );

  const canSendEvent: CanSend = useCallback(
    (eventType, powerLevel) => {
      const { events, events_default: eventsDefault } = powerLevels;
      if (events && eventType && typeof events[eventType] === 'number') {
        return powerLevel >= events[eventType];
      }
      return powerLevel >= (eventsDefault ?? DefaultPowerLevels.eventsDefault);
    },
    [powerLevels]
  );

  const canSendStateEvent: CanSend = useCallback(
    (eventType, powerLevel) => {
      const { events, state_default: stateDefault } = powerLevels;
      if (events && eventType && typeof events[eventType] === 'number') {
        return powerLevel >= events[eventType];
      }
      return powerLevel >= (stateDefault ?? DefaultPowerLevels.stateDefault);
    },
    [powerLevels]
  );

  const canDoAction: CanDoAction = useCallback(
    (action, powerLevel) => {
      const requiredPL = powerLevels[action];
      if (typeof requiredPL === 'number') {
        return powerLevel >= requiredPL;
      }
      return powerLevel >= DefaultPowerLevels[action];
    },
    [powerLevels]
  );

  return {
    getPowerLevel,
    canSendEvent,
    canSendStateEvent,
    canDoAction,
  };
}

export const PowerLevelsContext = createContext<PowerLevelsAPI | null>(null);

export const PowerLevelsContextProvider = PowerLevelsContext.Provider;

export const usePowerLevelsAPI = (): PowerLevelsAPI => {
  const api = useContext(PowerLevelsContext);
  if (!api) throw new Error('PowerLevelContext is not initialized!');
  return api;
};
