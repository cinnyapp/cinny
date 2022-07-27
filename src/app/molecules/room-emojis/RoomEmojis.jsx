import React from 'react';
import PropTypes from 'prop-types';

import initMatrix from '../../../client/initMatrix';
import ImagePack from '../image-pack/ImagePack';

function RoomEmojis({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const packEvents = room.currentState.getStateEvents('im.ponies.room_emotes');
  const unUsablePacks = [];
  const usablePacks = packEvents.filter((mEvent) => {
    if (typeof mEvent.getContent()?.images !== 'object') {
      unUsablePacks.push(mEvent);
      return false;
    }
    return true;
  });

  return usablePacks.map((mEvent) => (
    <ImagePack
      key={mEvent.getId()}
      roomId={roomId}
      stateKey={mEvent.getStateKey()}
    />
  ));
}

RoomEmojis.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomEmojis;
