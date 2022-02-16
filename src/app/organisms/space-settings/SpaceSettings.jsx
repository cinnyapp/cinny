import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpaceSettings.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { leave, createSpaceShortcut, deleteSpaceShortcut } from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import Tabs from '../../atoms/tabs/Tabs';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomProfile from '../../molecules/room-profile/RoomProfile';
import RoomVisibility from '../../molecules/room-visibility/RoomVisibility';
import RoomAliases from '../../molecules/room-aliases/RoomAliases';
import RoomPermissions from '../../molecules/room-permissions/RoomPermissions';
import RoomMembers from '../../molecules/room-members/RoomMembers';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import ShieldUserIC from '../../../../public/res/ic/outlined/shield-user.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import PinIC from '../../../../public/res/ic/outlined/pin.svg';
import PinFilledIC from '../../../../public/res/ic/filled/pin.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';

const tabText = {
  GENERAL: 'General',
  MEMBERS: 'Members',
  PERMISSIONS: 'Permissions',
};

const tabItems = [{
  iconSrc: SettingsIC,
  text: tabText.GENERAL,
  disabled: false,
}, {
  iconSrc: UserIC,
  text: tabText.MEMBERS,
  disabled: false,
}, {
  iconSrc: ShieldUserIC,
  text: tabText.PERMISSIONS,
  disabled: false,
}];

function GeneralSettings({ roomId }) {
  const isPinned = initMatrix.roomList.spaceShortcut.has(roomId);
  const [, forceUpdate] = useForceUpdate();

  return (
    <>
      <div className="room-settings__card">
        <MenuHeader>Options</MenuHeader>
        <MenuItem
          onClick={() => {
            if (isPinned) deleteSpaceShortcut(roomId);
            else createSpaceShortcut(roomId);
            forceUpdate();
          }}
          iconSrc={isPinned ? PinFilledIC : PinIC}
        >
          {isPinned ? 'Unpin from sidebar' : 'Pin to sidebar'}
        </MenuItem>
        <MenuItem
          variant="danger"
          onClick={() => {
            if (confirm('Are you really want to leave this space?')) {
              leave(roomId);
            }
          }}
          iconSrc={LeaveArrowIC}
        >
          Leave
        </MenuItem>
      </div>
      <div className="space-settings__card">
        <MenuHeader>Space visibility (who can join)</MenuHeader>
        <RoomVisibility roomId={roomId} />
      </div>
      <div className="space-settings__card">
        <MenuHeader>Space addresses</MenuHeader>
        <RoomAliases roomId={roomId} />
      </div>
    </>
  );
}

GeneralSettings.propTypes = {
  roomId: PropTypes.string.isRequired,
};

function useWindowToggle(setSelectedTab) {
  const [window, setWindow] = useState(null);

  useEffect(() => {
    const openSpaceSettings = (roomId, tab) => {
      setWindow({ roomId, tabText });
      const tabItem = tabItems.find((item) => item.text === tab);
      if (tabItem) setSelectedTab(tabItem);
    };
    navigation.on(cons.events.navigation.SPACE_SETTINGS_OPENED, openSpaceSettings);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_SETTINGS_OPENED, openSpaceSettings);
    };
  }, []);

  const requestClose = () => setWindow(null);

  return [window, requestClose];
}

function SpaceSettings() {
  const [selectedTab, setSelectedTab] = useState(tabItems[0]);
  const [window, requestClose] = useWindowToggle(setSelectedTab);
  const isOpen = window !== null;
  const roomId = window?.roomId;

  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const handleTabChange = (tabItem) => {
    setSelectedTab(tabItem);
  };

  return (
    <PopupWindow
      isOpen={isOpen}
      className="space-settings"
      title={(
        <Text variant="s1" weight="medium" primary>
          {isOpen && twemojify(room.name)}
          <span style={{ color: 'var(--tc-surface-low)' }}> — space settings</span>
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {isOpen && (
        <div className="space-settings__content">
          <RoomProfile roomId={roomId} />
          <Tabs
            items={tabItems}
            defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
            onSelect={handleTabChange}
          />
          <div className="space-settings__cards-wrapper">
            {selectedTab.text === tabText.GENERAL && <GeneralSettings roomId={roomId} />}
            {selectedTab.text === tabText.MEMBERS && <RoomMembers roomId={roomId} />}
            {selectedTab.text === tabText.PERMISSIONS && <RoomPermissions roomId={roomId} />}
          </div>
        </div>
      )}
    </PopupWindow>
  );
}

export default SpaceSettings;
