import { Unread } from '../../../types/matrix/room';
import { roomToUnreadAtom } from '../room/roomToUnread';

export const useRoomsUnread = (
  rooms: string[],
  roomToUnreadAtm: typeof roomToUnreadAtom
): Unread | undefined => undefined;

export const useRoomUnread = (
  roomId: string,
  roomToUnreadAtm: typeof roomToUnreadAtom
): Unread | undefined => undefined;
