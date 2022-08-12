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

async function sendReaction(roomId, toEventId, reaction, shortcode) {
  const mx = initMatrix.matrixClient;
  const content = {
    'm.relates_to': {
      event_id: toEventId,
      key: reaction,
      rel_type: 'm.annotation',
    },
  };
  if (typeof shortcode === 'string') content.shortcode = shortcode;
  try {
    await mx.sendEvent(roomId, 'm.reaction', content);
  } catch (e) {
    throw new Error(e);
  }
}

export {
  redactEvent,
  sendReaction,
};
