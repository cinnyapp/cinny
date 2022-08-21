import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './InviteList.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import * as roomActions from '../../../client/action/room';
import { selectRoom, selectTab } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import '../../i18n';

function InviteList({ isOpen, onRequestClose }) {
  const [procInvite, changeProcInvite] = useState(new Set());

  const { t } = useTranslation();

  function acceptInvite(roomId, isDM) {
    procInvite.add(roomId);
    changeProcInvite(new Set(Array.from(procInvite)));
    roomActions.join(roomId, isDM);
  }
  function rejectInvite(roomId, isDM) {
    procInvite.add(roomId);
    changeProcInvite(new Set(Array.from(procInvite)));
    roomActions.leave(roomId, isDM);
  }
  function updateInviteList(roomId) {
    if (procInvite.has(roomId)) procInvite.delete(roomId);
    changeProcInvite(new Set(Array.from(procInvite)));

    const rl = initMatrix.roomList;
    const totalInvites = rl.inviteDirects.size + rl.inviteRooms.size + rl.inviteSpaces.size;
    const room = initMatrix.matrixClient.getRoom(roomId);
    const isRejected = room === null || room?.getMyMembership() !== 'join';
    if (!isRejected) {
      if (room.isSpaceRoom()) selectTab(roomId);
      else selectRoom(roomId);
      onRequestClose();
    }
    if (totalInvites === 0) onRequestClose();
  }

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.INVITELIST_UPDATED, updateInviteList);

    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.INVITELIST_UPDATED, updateInviteList);
    };
  }, [procInvite]);

  function renderRoomTile(roomId) {
    const mx = initMatrix.matrixClient;
    const myRoom = mx.getRoom(roomId);
    if (!myRoom) return null;
    const roomName = myRoom.name;
    let roomAlias = myRoom.getCanonicalAlias();
    if (!roomAlias) roomAlias = myRoom.roomId;
    const inviterName = myRoom.getMember(mx.getUserId())?.events?.member?.getSender?.() ?? '';
    return (
      <RoomTile
        key={myRoom.roomId}
        name={roomName}
        avatarSrc={initMatrix.matrixClient.getRoom(roomId).getAvatarUrl(initMatrix.matrixClient.baseUrl, 42, 42, 'crop')}
        id={roomAlias}
        inviterName={inviterName}
        options={
          procInvite.has(myRoom.roomId)
            ? (<Spinner size="small" />)
            : (
              <div className="invite-btn__container">
                <Button onClick={() => rejectInvite(myRoom.roomId)}>{t('Organisms.InviteList.reject_invite')}</Button>
                <Button onClick={() => acceptInvite(myRoom.roomId)} variant="primary">{t('Organisms.InviteList.accept_invite')}</Button>
              </div>
            )
        }
      />
    );
  }

  return (
    <PopupWindow
      isOpen={isOpen}
      title={t('Organisms.InviteList.title')}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip={t('common.close')} />}
      onRequestClose={onRequestClose}
    >
      <div className="invites-content">
        { initMatrix.roomList.inviteDirects.size !== 0 && (
          <div className="invites-content__subheading">
            <Text variant="b3" weight="bold">{t('Organisms.InviteList.direct_messages_title')}</Text>
          </div>
        )}
        {
          Array.from(initMatrix.roomList.inviteDirects).map((roomId) => {
            const myRoom = initMatrix.matrixClient.getRoom(roomId);
            if (myRoom === null) return null;
            const roomName = myRoom.name;
            return (
              <RoomTile
                key={myRoom.roomId}
                name={roomName}
                id={myRoom.getDMInviter() || roomId}
                options={
                  procInvite.has(myRoom.roomId)
                    ? (<Spinner size="small" />)
                    : (
                      <div className="invite-btn__container">
                        <Button onClick={() => rejectInvite(myRoom.roomId, true)}>{t('Organisms.InviteList.reject_invite')}</Button>
                        <Button onClick={() => acceptInvite(myRoom.roomId, true)} variant="primary">{t('Organisms.InviteList.accept_invite')}</Button>
                      </div>
                    )
                }
              />
            );
          })
        }
        { initMatrix.roomList.inviteSpaces.size !== 0 && (
          <div className="invites-content__subheading">
            <Text variant="b3" weight="bold">{t('Organisms.InviteList.spaces_title')}</Text>
          </div>
        )}
        { Array.from(initMatrix.roomList.inviteSpaces).map(renderRoomTile) }

        { initMatrix.roomList.inviteRooms.size !== 0 && (
          <div className="invites-content__subheading">
            <Text variant="b3" weight="bold">{t('Organisms.InviteList.rooms_title')}</Text>
          </div>
        )}
        { Array.from(initMatrix.roomList.inviteRooms).map(renderRoomTile) }
      </div>
    </PopupWindow>
  );
}

InviteList.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

export default InviteList;
