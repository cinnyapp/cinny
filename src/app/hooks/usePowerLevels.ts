import { MatrixEvent, Room } from 'matrix-js-sdk';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import produce from 'immer';
import { useStateEvent } from './useStateEvent';
import { StateEvent } from '../../types/matrix/room';
import { useStateEventCallback } from './useStateEventCallback';
import { useMatrixClient } from './useMatrixClient';
import { getStateEvent } from '../utils/room';

export type PowerLevelActions = 'invite' | 'redact' | 'kick' | 'ban' | 'historical';
export type PowerLevelNotificationsAction = 'room';

export type IPowerLevels = {
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
};

const DEFAULT_POWER_LEVELS: Required<IPowerLevels> = {
  users_default: 0,
  state_default: 50,
  events_default: 0,
  invite: 0,
  redact: 50,
  kick: 50,
  ban: 50,
  historical: 0,
  events: {},
  users: {},
  notifications: {
    room: 50,
  },
};

const fillMissingPowers = (powerLevels: IPowerLevels): IPowerLevels =>
  produce(powerLevels, (draftPl: IPowerLevels) => {
    const keys = Object.keys(DEFAULT_POWER_LEVELS) as unknown as (keyof IPowerLevels)[];
    keys.forEach((key) => {
      if (draftPl[key] === undefined) {
        // eslint-disable-next-line no-param-reassign
        draftPl[key] = DEFAULT_POWER_LEVELS[key] as any;
      }
    });
    if (draftPl.notifications && typeof draftPl.notifications.room !== 'number') {
      // eslint-disable-next-line no-param-reassign
      draftPl.notifications.room = DEFAULT_POWER_LEVELS.notifications.room;
    }
    return draftPl;
  });

export const getPowersLevelFromMatrixEvent = (mEvent?: MatrixEvent): IPowerLevels => {
  const plContent = mEvent?.getContent<IPowerLevels>();

  const powerLevels = !plContent ? DEFAULT_POWER_LEVELS : fillMissingPowers(plContent);

  return powerLevels;
};

export function usePowerLevels(room: Room): IPowerLevels {
  const powerLevelsEvent = useStateEvent(room, StateEvent.RoomPowerLevels);
  const powerLevels: IPowerLevels = useMemo(
    () => getPowersLevelFromMatrixEvent(powerLevelsEvent),
    [powerLevelsEvent]
  );

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
  const getRoomsPowerLevels = useCallback(() => {
    const rToPl = new Map<string, IPowerLevels>();

    rooms.forEach((room) => {
      const mEvent = getStateEvent(room, StateEvent.RoomPowerLevels, '');
      rToPl.set(room.roomId, getPowersLevelFromMatrixEvent(mEvent));
    });

    return rToPl;
  }, [rooms]);

  const [roomToPowerLevels, setRoomToPowerLevels] = useState(() => getRoomsPowerLevels());

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
          setRoomToPowerLevels(getRoomsPowerLevels());
        }
      },
      [rooms, getRoomsPowerLevels]
    )
  );

  return roomToPowerLevels;
};

export type ReadPowerLevelAPI = {
  user: (powerLevels: IPowerLevels, userId: string | undefined) => number;
  event: (powerLevels: IPowerLevels, eventType: string | undefined) => number;
  state: (powerLevels: IPowerLevels, eventType: string | undefined) => number;
  action: (powerLevels: IPowerLevels, action: PowerLevelActions) => number;
  notification: (powerLevels: IPowerLevels, action: PowerLevelNotificationsAction) => number;
};

export const readPowerLevel: ReadPowerLevelAPI = {
  user: (powerLevels, userId) => {
    const { users_default: usersDefault, users } = powerLevels;

    if (userId && users && typeof users[userId] === 'number') {
      return users[userId];
    }
    return usersDefault ?? DEFAULT_POWER_LEVELS.users_default;
  },
  event: (powerLevels, eventType) => {
    const { events, events_default: eventsDefault } = powerLevels;
    if (events && eventType && typeof events[eventType] === 'number') {
      return events[eventType];
    }
    return eventsDefault ?? DEFAULT_POWER_LEVELS.events_default;
  },
  state: (powerLevels, eventType) => {
    const { events, state_default: stateDefault } = powerLevels;
    if (events && eventType && typeof events[eventType] === 'number') {
      return events[eventType];
    }
    return stateDefault ?? DEFAULT_POWER_LEVELS.state_default;
  },
  action: (powerLevels, action) => {
    const powerLevel = powerLevels[action];
    if (typeof powerLevel === 'number') {
      return powerLevel;
    }
    return DEFAULT_POWER_LEVELS[action];
  },
  notification: (powerLevels, action) => {
    const powerLevel = powerLevels.notifications?.[action];
    if (typeof powerLevel === 'number') {
      return powerLevel;
    }
    return DEFAULT_POWER_LEVELS.notifications[action];
  },
};

export const useGetMemberPowerLevel = (powerLevels: IPowerLevels) => {
  const callback = useCallback(
    (userId?: string): number => readPowerLevel.user(powerLevels, userId),
    [powerLevels]
  );

  return callback;
};

/**
 * Permissions
 */

type DefaultPermissionLocation = {
  user: true;
  key?: string;
};

type ActionPermissionLocation = {
  action: true;
  key: PowerLevelActions;
};

type EventPermissionLocation = {
  state?: true;
  key?: string;
};

type NotificationPermissionLocation = {
  notification: true;
  key: PowerLevelNotificationsAction;
};

export type PermissionLocation =
  | DefaultPermissionLocation
  | ActionPermissionLocation
  | EventPermissionLocation
  | NotificationPermissionLocation;

export const getPermissionPower = (
  powerLevels: IPowerLevels,
  location: PermissionLocation
): number => {
  if ('user' in location) {
    return readPowerLevel.user(powerLevels, location.key);
  }
  if ('action' in location) {
    return readPowerLevel.action(powerLevels, location.key);
  }
  if ('notification' in location) {
    return readPowerLevel.notification(powerLevels, location.key);
  }
  if ('state' in location) {
    return readPowerLevel.state(powerLevels, location.key);
  }

  return readPowerLevel.event(powerLevels, location.key);
};

export const applyPermissionPower = (
  powerLevels: IPowerLevels,
  location: PermissionLocation,
  power: number
): IPowerLevels => {
  if ('user' in location) {
    if (typeof location.key === 'string') {
      const users = powerLevels.users ?? {};
      users[location.key] = power;
      // eslint-disable-next-line no-param-reassign
      powerLevels.users = users;
      return powerLevels;
    }
    // eslint-disable-next-line no-param-reassign
    powerLevels.users_default = power;
    return powerLevels;
  }
  if ('action' in location) {
    // eslint-disable-next-line no-param-reassign
    powerLevels[location.key] = power;
    return powerLevels;
  }
  if ('notification' in location) {
    const notifications = powerLevels.notifications ?? {};
    notifications[location.key] = power;
    // eslint-disable-next-line no-param-reassign
    powerLevels.notifications = notifications;
    return powerLevels;
  }
  if ('state' in location) {
    if (typeof location.key === 'string') {
      const events = powerLevels.events ?? {};
      events[location.key] = power;
      // eslint-disable-next-line no-param-reassign
      powerLevels.events = events;
      return powerLevels;
    }
    // eslint-disable-next-line no-param-reassign
    powerLevels.state_default = power;
    return powerLevels;
  }

  if (typeof location.key === 'string') {
    const events = powerLevels.events ?? {};
    events[location.key] = power;
    // eslint-disable-next-line no-param-reassign
    powerLevels.events = events;
    return powerLevels;
  }
  // eslint-disable-next-line no-param-reassign
  powerLevels.events_default = power;
  return powerLevels;
};
