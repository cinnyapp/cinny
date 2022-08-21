import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomProfile.scss';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
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

import '../../i18n';

function RoomProfile({ roomId }) {
  const isMountStore = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [, forceUpdate] = useForceUpdate();
  const [status, setStatus] = useState({
    msg: null,
    type: cons.status.PRE_FLIGHT,
  });

  const { t } = useTranslation();

  const mx = initMatrix.matrixClient;
  const isDM = initMatrix.roomList.directs.has(roomId);
  let avatarSrc = mx.getRoom(roomId).getAvatarUrl(mx.baseUrl, 36, 36, 'crop');
  avatarSrc = isDM ? mx.getRoom(roomId).getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 36, 36, 'crop') : avatarSrc;
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
    const { roomList } = initMatrix;
    const handleProfileUpdate = (rId) => {
      if (roomId !== rId) return;
      forceUpdate();
    };

    roomList.on(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOM_PROFILE_UPDATED, handleProfileUpdate);
      isMountStore.setItem(false);
      setStatus({
        msg: null,
        type: cons.status.PRE_FLIGHT,
      });
      setIsEditing(false);
    };
  }, [roomId]);

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
            msg: t('Molecules.RoomProfile.saving_room_name'),
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
              msg: t('Molecules.RoomProfile.saving_room_topic'),
              type: cons.status.IN_FLIGHT,
            });
          }
          await mx.setRoomTopic(roomId, newTopic);
        }
      }
      if (!isMountStore.getItem()) return;
      setStatus({
        msg: t('Molecules.RoomProfile.save_success'),
        type: cons.status.SUCCESS,
      });
    } catch (err) {
      if (!isMountStore.getItem()) return;
      setStatus({
        msg: err.message || t('Molecules.RoomProfile.save_failed'),
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
        t('Molecules.RoomProfile.remove_avatar_title'),
        t('Molecules.RoomProfile.remove_avatar_subtitle'),
        t('Molecules.RoomProfile.remove_avatar_button'),
        'caution',
      );
      if (isConfirmed) {
        await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
      }
    } else await mx.sendStateEvent(roomId, 'm.room.avatar', { url }, '');
  };

  const renderEditNameAndTopic = () => (
    <form className="room-profile__edit-form" onSubmit={handleOnSubmit}>
      {canChangeName && <Input value={roomName} name="room-name" disabled={status.type === cons.status.IN_FLIGHT} label={t('Molecules.RoomProfile.name_label')} />}
      {canChangeTopic && <Input value={roomTopic} name="room-topic" disabled={status.type === cons.status.IN_FLIGHT} minHeight={100} resizable label={t('Molecules.RoomProfile.topic_label')} />}
      {(!canChangeName || !canChangeTopic) && (
      <Text variant="b3">
        {
        // eslint-disable-next-line no-nested-ternary
        room.isSpaceRoom()
          ? canChangeName ? 'Molecules.RoomProfile.permission_change_space_name' : 'Molecules.RoomProfile.permission_change_space_topic'
          : canChangeName ? 'Molecules.RoomProfile.permission_change_room_name' : 'Molecules.RoomProfile.permission_change_room_topic'
      }
      </Text>
      )}
      { status.type === cons.status.IN_FLIGHT && <Text variant="b2">{status.msg}</Text>}
      { status.type === cons.status.SUCCESS && <Text style={{ color: 'var(--tc-positive-high)' }} variant="b2">{status.msg}</Text>}
      { status.type === cons.status.ERROR && <Text style={{ color: 'var(--tc-danger-high)' }} variant="b2">{status.msg}</Text>}
      { status.type !== cons.status.IN_FLIGHT && (
        <div>
          <Button type="submit" variant="primary">{t('common.save')}</Button>
          <Button onClick={handleCancelEditing}>{t('common.cancel')}</Button>
        </div>
      )}
    </form>
  );

  const renderNameAndTopic = () => (
    <div className="room-profile__display" style={{ marginBottom: avatarSrc && canChangeAvatar ? '24px' : '0' }}>
      <div>
        <Text variant="h2" weight="medium" primary>{twemojify(roomName)}</Text>
        { (canChangeName || canChangeTopic) && (
          <IconButton
            src={PencilIC}
            size="extra-small"
            tooltip={t('common.edit')}
            onClick={() => setIsEditing(true)}
          />
        )}
      </div>
      <Text variant="b3">{room.getCanonicalAlias() || room.roomId}</Text>
      {roomTopic && <Text variant="b2">{twemojify(roomTopic, undefined, true)}</Text>}
    </div>
  );

  return (
    <div className="room-profile">
      <div className="room-profile__content">
        { !canChangeAvatar && <Avatar imageSrc={avatarSrc} text={roomName} bgColor={colorMXID(roomId)} size="large" />}
        { canChangeAvatar && (
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
