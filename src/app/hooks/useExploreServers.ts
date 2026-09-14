import { useCallback, useMemo } from 'react';
import { AccountDataEvent } from '../../types/matrix/accountData';
import { useAccountData } from './useAccountData';
import { useMatrixClient } from './useMatrixClient';

export type InCinnyExploreServersContent = {
  servers?: string[];
};

export const useExploreServers = (): [
  string[],
  (server: string) => Promise<void>,
  (server: string) => Promise<void>
] => {
  const mx = useMatrixClient();
  const accountData = useAccountData(AccountDataEvent.CinnyExplore);
  const userAddedServers = useMemo(
    () => accountData?.getContent<InCinnyExploreServersContent>()?.servers ?? [],
    [accountData]
  );

  const addServer = useCallback(
    async (server: string) => {
      if (userAddedServers.indexOf(server) === -1) {
        // @ts-expect-error Custom account data event
        await mx.setAccountData(AccountDataEvent.CinnyExplore, {
          servers: [...userAddedServers, server],
        });
      }
    },
    [mx, userAddedServers]
  );

  const removeServer = useCallback(
    async (server: string) => {
      // @ts-expect-error Custom account data event
      await mx.setAccountData(AccountDataEvent.CinnyExplore, {
        servers: userAddedServers.filter((addedServer) => server !== addedServer),
      });
    },
    [mx, userAddedServers]
  );

  return [userAddedServers, addServer, removeServer];
};
