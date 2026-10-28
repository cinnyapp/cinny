import { useFriendsPoller } from './useFriends';
import { useAutoAcceptFriendDMs } from './useAutoAcceptFriendDMs';

// Renders nothing; mounts the poller. Only used where the sidebar (FriendsTab) is not mounted.
export function FriendsPoller() {
  useFriendsPoller();
  useAutoAcceptFriendDMs();
  return null;
}
