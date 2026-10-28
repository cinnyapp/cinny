import { useFriendsPoller } from './useFriends';

// Renders nothing; mounts the poller. Only used where the sidebar (FriendsTab) is not mounted.
export function FriendsPoller() {
  useFriendsPoller();
  return null;
}
