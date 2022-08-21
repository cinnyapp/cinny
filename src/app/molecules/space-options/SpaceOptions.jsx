import React from 'react';
import PropTypes from 'prop-types';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openSpaceSettings, openSpaceManage, openInviteUser } from '../../../client/action/navigation';
import { markAsRead } from '../../../client/action/notifications';
import { leave } from '../../../client/action/room';
import {
  createSpaceShortcut,
  deleteSpaceShortcut,
  categorizeSpace,
  unCategorizeSpace,
} from '../../../client/action/accountData';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

import CategoryIC from '../../../../public/res/ic/outlined/category.svg';
import CategoryFilledIC from '../../../../public/res/ic/filled/category.svg';
import TickMarkIC from '../../../../public/res/ic/outlined/tick-mark.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import PinIC from '../../../../public/res/ic/outlined/pin.svg';
import PinFilledIC from '../../../../public/res/ic/filled/pin.svg';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';

import '../../i18n';

function SpaceOptions({ roomId, afterOptionSelect }) {
  const mx = initMatrix.matrixClient;
  const { roomList } = initMatrix;
  const room = mx.getRoom(roomId);
  const canInvite = room?.canInvite(mx.getUserId());
  const isPinned = initMatrix.accountData.spaceShortcut.has(roomId);
  const isCategorized = initMatrix.accountData.categorizedSpaces.has(roomId);

  const { t } = useTranslation();

  const handleMarkAsRead = () => {
    const spaceChildren = roomList.getCategorizedSpaces([roomId]);
    spaceChildren?.forEach((childIds) => {
      childIds?.forEach((childId) => {
        markAsRead(childId);
      });
    });
    afterOptionSelect();
  };
  const handleInviteClick = () => {
    openInviteUser(roomId);
    afterOptionSelect();
  };
  const handlePinClick = () => {
    if (isPinned) deleteSpaceShortcut(roomId);
    else createSpaceShortcut(roomId);
    afterOptionSelect();
  };
  const handleCategorizeClick = () => {
    if (isCategorized) unCategorizeSpace(roomId);
    else categorizeSpace(roomId);
    afterOptionSelect();
  };
  const handleSettingsClick = () => {
    openSpaceSettings(roomId);
    afterOptionSelect();
  };
  const handleManageRoom = () => {
    openSpaceManage(roomId);
    afterOptionSelect();
  };

  const handleLeaveClick = async () => {
    afterOptionSelect();
    const isConfirmed = await confirmDialog(
      t('Molecules.SpaceOptions.leave_space'),
      t('Molecules.SpaceOptions.leave_space_confirmation', { space: room.name }),
      t('Molecules.SpaceOptions.leave_space_confirmation'),
      'danger',
    );
    if (!isConfirmed) return;
    leave(roomId);
  };

  return (
    <div style={{ maxWidth: 'calc(var(--navigation-drawer-width) - var(--sp-normal))' }}>
      <MenuHeader>{twemojify(`Options for ${initMatrix.matrixClient.getRoom(roomId)?.name}`)}</MenuHeader>
      <MenuItem iconSrc={TickMarkIC} onClick={handleMarkAsRead}>Mark as read</MenuItem>
      <MenuItem
        onClick={handleCategorizeClick}
        iconSrc={isCategorized ? CategoryFilledIC : CategoryIC}
      >
        {isCategorized ? t('Organisms.SpaceSettings.uncategorize_subspaces') : t('Organisms.SpaceSettings.categorize_subspaces')}
      </MenuItem>
      <MenuItem
        onClick={handlePinClick}
        iconSrc={isPinned ? PinFilledIC : PinIC}
      >
        {isPinned ? t('Organisms.SpaceSettings.unpin_sidebar') : t('Organisms.SpaceSettings.pin_sidebar')}
      </MenuItem>
      <MenuItem
        iconSrc={AddUserIC}
        onClick={handleInviteClick}
        disabled={!canInvite}
      >
        {t('Molecules.SpaceOptions.invite')}
      </MenuItem>
      <MenuItem onClick={handleManageRoom} iconSrc={HashSearchIC}>{t('Molecules.SpaceOptions.manage_rooms')}</MenuItem>
      <MenuItem onClick={handleSettingsClick} iconSrc={SettingsIC}>{t('Molecules.SpaceOptions.settings')}</MenuItem>
      <MenuItem
        variant="danger"
        onClick={handleLeaveClick}
        iconSrc={LeaveArrowIC}
      >
        {t('Molecules.SpaceOptions.leave')}
      </MenuItem>
    </div>
  );
}

SpaceOptions.defaultProps = {
  afterOptionSelect: null,
};

SpaceOptions.propTypes = {
  roomId: PropTypes.string.isRequired,
  afterOptionSelect: PropTypes.func,
};

export default SpaceOptions;
