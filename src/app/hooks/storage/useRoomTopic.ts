import { useClient } from '../useClient';
import { useObservableValue } from '../useObservableValue';

export const useRoomTopic = (roomId: string): string | undefined => {
  const ct = useClient();
  const roomToTopic = useObservableValue(ct.roomToTopic);

  return roomToTopic.get(roomId);
};
