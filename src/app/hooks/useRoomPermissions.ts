import { useMemo } from 'react';
import {
  IPowerLevels,
  PowerLevelActions,
  PowerLevelNotificationsAction,
  readPowerLevel,
} from './usePowerLevels';

export type RoomPermissionsAPI = {
  event: (type: string, userId: string) => boolean;
  stateEvent: (type: string, userId: string) => boolean;
  action: (action: PowerLevelActions, userId: string) => boolean;
  notificationAction: (action: PowerLevelNotificationsAction, userId: string) => boolean;
};

export const getRoomPermissionsAPI = (
  creators: Set<string> | undefined,
  powerLevels: IPowerLevels
): RoomPermissionsAPI => {
  const api: RoomPermissionsAPI = {
    event: (type, userId) => {
      if (creators?.has(userId)) return true;
      const userPower = readPowerLevel.user(powerLevels, userId);
      const requiredPL = readPowerLevel.event(powerLevels, type);
      return userPower >= requiredPL;
    },
    stateEvent: (type, userId) => {
      if (creators?.has(userId)) return true;
      const userPower = readPowerLevel.user(powerLevels, userId);
      const requiredPL = readPowerLevel.state(powerLevels, type);
      return userPower >= requiredPL;
    },
    action: (action, userId) => {
      if (creators?.has(userId)) return true;
      const userPower = readPowerLevel.user(powerLevels, userId);
      const requiredPL = readPowerLevel.action(powerLevels, action);
      return userPower >= requiredPL;
    },
    notificationAction: (action, userId) => {
      if (creators?.has(userId)) return true;
      const userPower = readPowerLevel.user(powerLevels, userId);
      const requiredPL = readPowerLevel.notification(powerLevels, action);
      return userPower >= requiredPL;
    },
  };

  return api;
};

export const useRoomPermissions = (
  creators: Set<string> | undefined,
  powerLevels: IPowerLevels
): RoomPermissionsAPI => {
  const api: RoomPermissionsAPI = useMemo(
    () => getRoomPermissionsAPI(creators, powerLevels),
    [creators, powerLevels]
  );

  return api;
};
