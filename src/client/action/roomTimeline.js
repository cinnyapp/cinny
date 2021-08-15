import initMatrix from '../initMatrix';

async function redactEvent(roomId, eventId, reason) {
  const mx = initMatrix.matrixClient;

  try {
    await mx.redactEvent(roomId, eventId, undefined, typeof reason === 'undefined' ? undefined : { reason });
    return true;
  } catch (e) {
    throw new Error(e);
  }
}

async function sendReaction(roomId, toEventId, reaction) {
  const mx = initMatrix.matrixClient;

  try {
    await mx.sendEvent(roomId, 'm.reaction', {
      'm.relates_to': {
        event_id: toEventId,
        key: reaction,
        rel_type: 'm.annotation',
      },
    });
  } catch (e) {
    throw new Error(e);
  }
}

export {
  redactEvent,
  sendReaction,
};
