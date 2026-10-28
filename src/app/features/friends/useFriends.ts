import { useCallback, useEffect, useMemo } from 'react';
import { atom, useAtomValue, useSetAtom } from 'jotai';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { createFriendsApi, FriendsApiError, FriendsList } from './friendsApi';
import { createLatestGate } from './latestGate';

export const POLL_INTERVAL_MS = 20_000;

export const friendsAtom = atom<{ lists?: FriendsList; error?: FriendsApiError }>({});

// Shared by every refresh (poller and post-action) so only the newest response is applied.
const beginRefresh = createLatestGate();

export const useFriendsApi = () => {
  const mx = useMatrixClient();
  return useMemo(() => createFriendsApi(() => mx.getAccessToken()), [mx]);
};

const useRefresh = () => {
  const api = useFriendsApi();
  const setState = useSetAtom(friendsAtom);
  return useCallback(async () => {
    const isLatest = beginRefresh();
    try {
      const lists = await api.list();
      if (!isLatest()) return;
      setState({ lists });
    } catch (e) {
      if (!isLatest()) return;
      const error = e instanceof FriendsApiError ? e : new FriendsApiError('unknown', 0);
      setState((prev) => ({ lists: prev.lists, error }));
    }
  }, [api, setState]);
};

// Mount once (sidebar). Other consumers use useFriends() only.
export const useFriendsPoller = (): void => {
  const refresh = useRefresh();

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_INTERVAL_MS);
    window.addEventListener('focus', refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', refresh);
    };
  }, [refresh]);
};

export const useFriends = (): {
  lists?: FriendsList;
  error?: FriendsApiError;
  refresh: () => Promise<void>;
} => {
  const { lists, error } = useAtomValue(friendsAtom);
  const refresh = useRefresh();
  return { lists, error, refresh };
};
