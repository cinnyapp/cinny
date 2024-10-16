import { MatrixClient } from "matrix-js-sdk";

export async function markAsRead(mx: MatrixClient, roomId: string) {
  // Won't mark messages (or whatever in room) as read when tab inactive
  // or when browser is inactive (i.e. user interacts with some another app)
  if (document.hidden || !document.hasFocus()) return;

  const room = mx.getRoom(roomId);
  if (!room) return;

  const timeline = room.getLiveTimeline().getEvents();
  const readEventId = room.getEventReadUpTo(mx.getUserId()!);

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
