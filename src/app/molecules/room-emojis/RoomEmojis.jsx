import React, { useReducer, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomEmojis.scss';

import { suffixRename } from '../../../util/common';

import { MenuHeader } from '../../atoms/context-menu/ContextMenu';
import Text from '../../atoms/text/Text';
import Input from '../../atoms/input/Input';
import Button from '../../atoms/button/Button';
import ImagePack from '../image-pack/ImagePack';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function useRoomPacks(room) {
  const mx = useMatrixClient();
  const [, forceUpdate] = useReducer((count) => count + 1, 0);

  const packEvents = room.currentState.getStateEvents('im.ponies.room_emotes');
  const unUsablePacks = [];
  const usablePacks = packEvents.filter((mEvent) => {
    if (typeof mEvent.getContent()?.images !== 'object') {
      unUsablePacks.push(mEvent);
      return false;
    }
    return true;
  });

  useEffect(() => {
    const handleEvent = (event, state, prevEvent) => {
      if (event.getRoomId() !== room.roomId) return;
      if (event.getType() !== 'im.ponies.room_emotes') return;
      if (!prevEvent?.getContent()?.images || !event.getContent().images) {
        forceUpdate();
      }
    };

    mx.on('RoomState.events', handleEvent);
    return () => {
      mx.removeListener('RoomState.events', handleEvent);
    };
  }, [room, mx]);

  const isStateKeyAvailable = (key) => !room.currentState.getStateEvents('im.ponies.room_emotes', key);

  const createPack = async (name) => {
    const packContent = {
      pack: { display_name: name },
      images: {},
    };
    let stateKey = '';
    if (unUsablePacks.length > 0) {
      const mEvent = unUsablePacks[0];
      stateKey = mEvent.getStateKey();
    } else {
      stateKey = packContent.pack.display_name.replace(/\s/g, '-');
      if (!isStateKeyAvailable(stateKey)) {
        stateKey = suffixRename(
          stateKey,
          isStateKeyAvailable,
        );
      }
    }
    await mx.sendStateEvent(room.roomId, 'im.ponies.room_emotes', packContent, stateKey);
  };

  const deletePack = async (stateKey) => {
    await mx.sendStateEvent(room.roomId, 'im.ponies.room_emotes', {}, stateKey);
  };

  return {
    usablePacks,
    createPack,
    deletePack,
  };
}

function RoomEmojis({ roomId }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);

  const { usablePacks, createPack, deletePack } = useRoomPacks(room);

  const canChange = room.currentState.maySendStateEvent('im.ponies.room_emote', mx.getUserId());

  const handlePackCreate = (e) => {
    e.preventDefault();
    const { nameInput } = e.target;
    const name = nameInput.value.trim();
    if (name === '') return;
    nameInput.value = '';

    createPack(name);
  };

  return (
    <div className="room-emojis">
      { canChange && (
        <div className="room-emojis__add-pack">
          <MenuHeader>Create Pack</MenuHeader>
          <form onSubmit={handlePackCreate}>
            <Input name="nameInput" placeholder="Pack Name" required />
            <Button variant="primary" type="submit">Create pack</Button>
          </form>
        </div>
      )}
      {
        usablePacks.length > 0
          ? usablePacks.reverse().map((mEvent) => (
            <ImagePack
              key={mEvent.getId()}
              roomId={roomId}
              stateKey={mEvent.getStateKey()}
              handlePackDelete={canChange ? deletePack : undefined}
            />
          )) : (
            <div className="room-emojis__empty">
              <Text>No emoji or sticker pack.</Text>
            </div>
          )
      }
    </div>
  );
}

RoomEmojis.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomEmojis;
