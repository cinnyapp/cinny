import React from 'react';
import PropTypes from 'prop-types';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openInviteUser } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';
import { markAsRead } from '../../../client/action/notifications';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import RoomNotification from '../room-notification/RoomNotification';

import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';

function RoomOptions({ roomId, afterOptionSelect }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const canInvite = room?.canInvite(mx.getUserId());

  const { t } = useTranslation();

  const handleMarkAsRead = () => {
    markAsRead(roomId);
    afterOptionSelect();
  };

  const handleInviteClick = () => {
    openInviteUser(roomId);
    afterOptionSelect();
  };
  const handleLeaveClick = async () => {
    afterOptionSelect();
    const isConfirmed = await confirmDialog(
      t('Molecules.RoomOptions.leave.title'),
      t('Molecules.RoomOptions.leave.subtitle', { room_name: room.name }),
      t('Molecules.RoomOptions.leave.button_text'),
      'danger',
    );
    if (!isConfirmed) return;
    roomActions.leave(roomId);
  };

  return (
    <div style={{ maxWidth: '256px' }}>
      <MenuHeader>{twemojify(t('Molecules.RoomOptions.title', { room_name: initMatrix.matrixClient.getRoom(roomId)?.name }))}</MenuHeader>
      <MenuItem iconSrc={TickMarkIC} onClick={handleMarkAsRead}>{t('Molecules.RoomOptions.mark_as_read')}</MenuItem>
      <MenuItem
        iconSrc={AddUserIC}
        onClick={handleInviteClick}
        disabled={!canInvite}
      >
        {t('Molecules.RoomOptions.invite')}
      </MenuItem>
      <MenuItem iconSrc={LeaveArrowIC} variant="danger" onClick={handleLeaveClick}>{t('Molecules.RoomOptions.leave.button_text')}</MenuItem>
      <MenuHeader>{t('Molecules.RoomOptions.notifications_heading')}</MenuHeader>
      <RoomNotification roomId={roomId} />
    </div>
  );
}

RoomOptions.defaultProps = {
  afterOptionSelect: null,
};

RoomOptions.propTypes = {
  roomId: PropTypes.string.isRequired,
  afterOptionSelect: PropTypes.func,
};

export default RoomOptions;
