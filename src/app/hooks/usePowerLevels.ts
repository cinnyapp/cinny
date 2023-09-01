import { Room } from 'matrix-js-sdk';
import { useCallback } from 'react';
import { useStateEvent } from './useStateEvent';
import { StateEvent } from '../../types/matrix/room';

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

export function usePowerLevels(room: Room) {
  const powerLevelsEvent = useStateEvent(room, StateEvent.RoomPowerLevels);
  const powerLevels: IPowerLevels = powerLevelsEvent?.getContent() ?? DefaultPowerLevels;

  const getPowerLevel = useCallback(
    (userId: string) => {
      const { users_default: usersDefault, users } = powerLevels;
      if (users && typeof users[userId] === 'number') {
        return users[userId];
      }
      return usersDefault ?? DefaultPowerLevels.usersDefault;
    },
    [powerLevels]
  );

  const canSendEvent = useCallback(
    (eventType: string | undefined, powerLevel: number) => {
      const { events, events_default: eventsDefault } = powerLevels;
      if (events && eventType && typeof events[eventType] === 'number') {
        return powerLevel >= events[eventType];
      }
      return powerLevel >= (eventsDefault ?? DefaultPowerLevels.eventsDefault);
    },
    [powerLevels]
  );

  const canSendStateEvent = useCallback(
    (eventType: string | undefined, powerLevel: number) => {
      const { events, state_default: stateDefault } = powerLevels;
      if (events && eventType && typeof events[eventType] === 'number') {
        return powerLevel >= events[eventType];
      }
      return powerLevel >= (stateDefault ?? DefaultPowerLevels.stateDefault);
    },
    [powerLevels]
  );

  const canDoAction = useCallback(
    (action: 'invite' | 'redact' | 'kick' | 'ban' | 'historical', powerLevel: number) => {
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
