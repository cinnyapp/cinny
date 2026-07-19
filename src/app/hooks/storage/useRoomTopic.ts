import { StateEventType } from '../../../types/matrix/room';
import { useRoomStateEvent } from './useRoomStateEvent';

export const useRoomTopic = (roomId: string): string | undefined => {
  const topicEventResult = useRoomStateEvent(roomId, StateEventType.RoomTopic, '');

  const content = topicEventResult.value?.event.content;
  if (content && 'topic' in content && typeof content.topic === 'string') return content.topic;

  return undefined;
};
