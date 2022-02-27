import React from 'react';
import PropTypes from 'prop-types';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import { openSpaceSettings, openSpaceManage, openInviteUser } from '../../../client/action/navigation';
import { leave } from '../../../client/action/room';
import { createSpaceShortcut, deleteSpaceShortcut } from '../../../client/action/accountData';

import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';

import CategoryIC from '../../../../public/res/ic/outlined/category.svg';
import CategoryFilledIC from '../../../../public/res/ic/filled/category.svg';
import AddUserIC from '../../../../public/res/ic/outlined/add-user.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import PinIC from '../../../../public/res/ic/outlined/pin.svg';
import PinFilledIC from '../../../../public/res/ic/filled/pin.svg';

function SpaceOptions({ roomId, afterOptionSelect }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const canInvite = room?.canInvite(mx.getUserId());
  const isPinned = initMatrix.accountData.spaceShortcut.has(roomId);

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
    alert('categorize');
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

  const handleLeaveClick = () => {
    if (confirm('Are you really want to leave this space?')) {
      leave(roomId);
      afterOptionSelect();
    }
  };

  return (
    <div style={{ maxWidth: 'calc(var(--navigation-drawer-width) - var(--sp-normal))' }}>
      <MenuHeader>{twemojify(`Options for ${initMatrix.matrixClient.getRoom(roomId)?.name}`)}</MenuHeader>
      <MenuItem
        onClick={handleCategorizeClick}
        iconSrc={CategoryIC}
      >
        Categorize subspaces
      </MenuItem>
      <MenuItem
        onClick={handlePinClick}
        iconSrc={isPinned ? PinFilledIC : PinIC}
      >
        {isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
      </MenuItem>
      <MenuItem
        iconSrc={AddUserIC}
        onClick={handleInviteClick}
        disabled={!canInvite}
      >
        Invite
      </MenuItem>
      <MenuItem onClick={handleManageRoom} iconSrc={HashSearchIC}>Manage rooms</MenuItem>
      <MenuItem onClick={handleSettingsClick} iconSrc={SettingsIC}>Settings</MenuItem>
      <MenuItem
        variant="danger"
        onClick={handleLeaveClick}
        iconSrc={LeaveArrowIC}
      >
        Leave
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
