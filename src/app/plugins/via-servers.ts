import { IPowerLevels, readPowerLevel } from '../hooks/usePowerLevels';
import { getMxIdServer } from '../utils/matrix';

export const getViaServers = (
  creators?: Set<string>,
  powerLevels?: IPowerLevels,
  users?: string[]
): string[] => {
  const servers = new Set<string>();

  Array.from(creators ?? new Set<string>()).forEach((creator) => {
    if (powerLevels?.users?.[creator] === undefined) {
      const server = getMxIdServer(creator);
      if (server) servers.add(server);
    }
  });

  const getTwoPopularServers = (us: string[]) => {
    const serverToMemberCount = new Map<string, number>();
    us.forEach((user) => {
      const server = getMxIdServer(user);
      if (server === undefined) return;
      const count = serverToMemberCount.get(server) ?? 0;
      serverToMemberCount.set(server, count + 1);
    });

    const sortedUsers = Array.from(serverToMemberCount.keys()).sort((s1, s2) => {
      const c1 = serverToMemberCount.get(s1) ?? 0;
      const c2 = serverToMemberCount.get(s2) ?? 0;

      return c2 - c1;
    });

    return sortedUsers.slice(0, 2);
  };

  if (powerLevels && powerLevels.users) {
    const userDefaultPower = readPowerLevel.user(powerLevels, undefined);

    const powerUsers = Object.keys(powerLevels.users).filter(
      (userId) => readPowerLevel.user(powerLevels, userId) > userDefaultPower
    );

    getTwoPopularServers(powerUsers).forEach((server) => servers.add(server));
  }

  if (users) {
    getTwoPopularServers(users).forEach((server) => servers.add(server));
  }

  return Array.from(servers).slice(0, 3);
};
