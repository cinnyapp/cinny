import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useAtomValue } from 'jotai';
import Linkify from 'linkify-react';
import './RoomProfile.scss';

import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import IconButton from '../../atoms/button/IconButton';
import ImageUpload from '../image-upload/ImageUpload';

import PencilIC from '../../../../public/res/ic/outlined/pencil.svg';

import { useStore } from '../../hooks/useStore';
import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import { mDirectAtom } from '../../state/mDirectList';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { useMatrixClient } from '../../hooks/useMatrixClient';

function RoomProfile({ roomId }) {
  const isMountStore = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [, forceUpdate] = useForceUpdate();
  const [status, setStatus] = useState({
    msg: null,
    type: cons.status.PRE_FLIGHT,
  });

  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const isDM = mDirects.has(roomId);
  let avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  avatarSrc = isDM
    ? mx.getRoom(roomId).getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop')
    : avatarSrc;
  const room = mx.getRoom(roomId);
  const { currentState } = room;
  const roomName = room.name;
  const roomTopic = currentState.getStateEvents('m.room.topic')[0]?.getContent().topic;

  const userId = mx.getUserId();

  const canChangeAvatar = currentState.maySendStateEvent('m.room.avatar', userId);
  const canChangeName = currentState.maySendStateEvent('m.room.name', userId);
  const canChangeTopic = currentState.maySendStateEvent('m.room.topic', userId);

  useEffect(() => {
    isMountStore.setItem(true);
    const handleStateEvent = (mEvent) => {
      if (mEvent.event.room_id !== roomId) return;
      forceUpdate();
    };

    mx.on('RoomState.events', handleStateEvent);
    return () => {
      mx.removeListener('RoomState.events', handleStateEvent);
      isMountStore.setItem(false);
      setStatus({
        msg: null,
        type: cons.status.PRE_FLIGHT,
      });
      setIsEditing(false);
    };
  }, [mx, roomId]);

  const handleOnSubmit = async (e) => {
    e.preventDefault();
    const { target } = e;
    const roomNameInput = target.elements['room-name'];
    const roomTopicInput = target.elements['room-topic'];

    try {
      if (canChangeName) {
        const newName = roomNameInput.value;
        if (newName !== roomName && roomName.trim() !== '') {
          setStatus({
            msg: 'Saving room name...',
            type: cons.status.IN_FLIGHT,
          });
          await mx.setRoomName(roomId, newName);
        }
      }
      if (canChangeTopic) {
        const newTopic = roomTopicInput.value;
        if (newTopic !== roomTopic) {
          if (isMountStore.getItem()) {
            setStatus({
              msg: 'Saving room topic...',
              type: cons.status.IN_FLIGHT,
            });
          }
          await mx.setRoomTopic(roomId, newTopic);
        }
      }
      if (!isMountStore.getItem()) return;
      setStatus({
        msg: 'Saved successfully',
        type: cons.status.SUCCESS,
      });
    } catch (err) {
      if (!isMountStore.getItem()) return;
      setStatus({
        msg: err.message || 'Unable to save.',
        type: cons.status.ERROR,
      });
    }
  };

  const handleCancelEditing = () => {
    setStatus({
      msg: null,
      type: cons.status.PRE_FLIGHT,
    });
    setIsEditing(false);
  };

  const handleAvatarUpload = async (url) => {
    if (url === null) {
      const isConfirmed = await confirmDialog(
        'Remove avatar',
        'Are you sure that you want to remove room avatar?',
        'Remove',
        'caution'
      );
      if (isConfirmed) {
        await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
      }
    } else await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
  };

  const renderEditNameAndTopic = () => (
    <form className="room-profile__edit-form" onSubmit={handleOnSubmit}>
      {canChangeName && (
        <Input
          value={roomName}
          name="room-name"
          disabled={status.type === cons.status.IN_FLIGHT}
          label="Name"
        />
      )}
      {canChangeTopic && (
        <Input
          value={roomTopic}
          name="room-topic"
          disabled={status.type === cons.status.IN_FLIGHT}
          minHeight={100}
          resizable
          label="Topic"
        />
      )}
      {(!canChangeName || !canChangeTopic) && (
        <Text variant="b3">{`You have permission to change ${
          room.isSpaceRoom() ? 'space' : 'room'
        } ${canChangeName ? 'name' : 'topic'} only.`}</Text>
      )}
      {status.type === cons.status.IN_FLIGHT && <Text variant="b2">{status.msg}</Text>}
      {status.type === cons.status.SUCCESS && (
        <Text style={{ color: 'var(--tc-positive-high)' }} variant="b2">
          {status.msg}
        </Text>
      )}
      {status.type === cons.status.ERROR && (
        <Text style={{ color: 'var(--tc-danger-high)' }} variant="b2">
          {status.msg}
        </Text>
      )}
      {status.type !== cons.status.IN_FLIGHT && (
        <div>
          <Button type="submit" variant="primary">
            Save
          </Button>
          <Button onClick={handleCancelEditing}>Cancel</Button>
        </div>
      )}
    </form>
  );

  const renderNameAndTopic = () => (
    <div
      className="room-profile__display"
      style={{ marginBottom: avatarSrc && canChangeAvatar ? '24px' : '0' }}
    >
      <div>
        <Text variant="h2" weight="medium" primary>
          {roomName}
        </Text>
        {(canChangeName || canChangeTopic) && (
          <IconButton
            src={PencilIC}
            size="extra-small"
            tooltip="Edit"
            onClick={() => setIsEditing(true)}
          />
        )}
      </div>
      <Text variant="b3">{room.getCanonicalAlias() || room.roomId}</Text>
      {roomTopic && (
        <Text variant="b2">
          <Linkify options={LINKIFY_OPTS}>{roomTopic}</Linkify>
        </Text>
      )}
    </div>
  );

  return (
    <div className="room-profile">
      <div className="room-profile__content">
        {!canChangeAvatar && (
          <Avatar imageSrc={avatarSrc} text={roomName} bgColor={colorMXID(roomId)} size="large" />
        )}
        {canChangeAvatar && (
          <ImageUpload
            text={roomName}
            bgColor={colorMXID(roomId)}
            imageSrc={avatarSrc}
            onUpload={handleAvatarUpload}
            onRequestRemove={() => handleAvatarUpload(null)}
          />
        )}
        {!isEditing && renderNameAndTopic()}
        {isEditing && renderEditNameAndTopic()}
      </div>
    </div>
  );
}

RoomProfile.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomProfile;
