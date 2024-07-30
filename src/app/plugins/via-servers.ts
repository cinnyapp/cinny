import { Room } from 'matrix-js-sdk';
import { IPowerLevels } from '../hooks/usePowerLevels';
import { getMxIdServer } from '../utils/matrix';
import { StateEvent } from '../../types/matrix/room';
import { getStateEvent } from '../utils/room';

export const getViaServers = (room: Room): string[] => {
  const getHighestPowerUserId = (): string | undefined => {
    const powerLevels = getStateEvent(room, StateEvent.RoomPowerLevels)?.getContent<IPowerLevels>();

    if (!powerLevels) return undefined;
    const userIdToPower = powerLevels.users;
    if (!userIdToPower) return undefined;
    let powerUserId: string | undefined;

    Object.keys(userIdToPower).forEach((userId) => {
      if (userIdToPower[userId] <= (powerLevels.users_default ?? 0)) return;

      if (!powerUserId) {
        powerUserId = userId;
        return;
      }
      if (userIdToPower[userId] > userIdToPower[powerUserId]) {
        powerUserId = userId;
      }
    });
    return powerUserId;
  };

  const getServerToPopulation = (): Record<string, number> => {
    const members = room.getMembers();
    const serverToPop: Record<string, number> = {};

    members?.forEach((member) => {
      const { userId } = member;
      const server = getMxIdServer(userId);
      if (!server) return;
      const serverPop = serverToPop[server];
      if (serverPop === undefined) {
        serverToPop[server] = 1;
        return;
      }
      serverToPop[server] = serverPop + 1;
    });

    return serverToPop;
  };

  const via: string[] = [];
  const userId = getHighestPowerUserId();
  if (userId) {
    const server = getMxIdServer(userId);
    if (server) via.push(server);
  }
  const serverToPop = getServerToPopulation();
  const sortedServers = Object.keys(serverToPop).sort(
    (svrA, svrB) => serverToPop[svrB] - serverToPop[svrA]
  );
  const mostPop3 = sortedServers.slice(0, 3);
  if (via.length === 0) return mostPop3;
  if (mostPop3.includes(via[0])) {
    mostPop3.splice(mostPop3.indexOf(via[0]), 1);
  }
  return via.concat(mostPop3.slice(0, 2));
};
