import initMatrix from '../initMatrix';

// eslint-disable-next-line import/prefer-default-export
export async function markAsRead(roomId) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  if (!room) return;
  initMatrix.notifications.deleteNoti(roomId);

  const timeline = room.getLiveTimeline().getEvents();
  const readEventId = room.getEventReadUpTo(mx.getUserId());

  const getLatestValidEvent = () => {
    for (let i = timeline.length - 1; i >= 0; i -= 1) {
      const latestEvent = timeline[i];
      if (latestEvent.getId() === readEventId) return null;
      if (!latestEvent.isSending()) return latestEvent;
    }
    return null;
  };
  if (timeline.length === 0) return;
  const latestEvent = getLatestValidEvent();
  if (latestEvent === null) return;

  await mx.sendReadReceipt(latestEvent);
}
