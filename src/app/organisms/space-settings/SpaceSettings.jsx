import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpaceSettings.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

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
import RoomEmojis from '../../molecules/room-emojis/RoomEmojis';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import ShieldUserIC from '../../../../public/res/ic/outlined/shield-user.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const tabText = {
  GENERAL: 'General',
  MEMBERS: 'Members',
  EMOJIS: 'Emojis',
  PERMISSIONS: 'Permissions',
};

const tabItems = [
  {
    iconSrc: SettingsIC,
    text: tabText.GENERAL,
    disabled: false,
  },
  {
    iconSrc: UserIC,
    text: tabText.MEMBERS,
    disabled: false,
  },
  {
    iconSrc: EmojiIC,
    text: tabText.EMOJIS,
    disabled: false,
  },
  {
    iconSrc: ShieldUserIC,
    text: tabText.PERMISSIONS,
    disabled: false,
  },
];

function GeneralSettings({ roomId }) {
  const mx = useMatrixClient();
  const roomName = mx.getRoom(roomId)?.name;

  return (
    <>
      <div className="room-settings__card">
        <MenuHeader>Options</MenuHeader>
        <MenuItem
          variant="danger"
          onClick={async () => {
            const isConfirmed = await confirmDialog(
              'Leave space',
              `Are you sure that you want to leave "${roomName}" space?`,
              'Leave',
              'danger'
            );
            if (isConfirmed) mx.leave(roomId);
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

  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);

  const handleTabChange = (tabItem) => {
    setSelectedTab(tabItem);
  };

  return (
    <PopupWindow
      isOpen={isOpen}
      className="space-settings"
      title={
        <Text variant="s1" weight="medium" primary>
          {isOpen && room.name}
          <span style={{ color: 'var(--tc-surface-low)' }}> — space settings</span>
        </Text>
      }
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
            {selectedTab.text === tabText.EMOJIS && <RoomEmojis roomId={roomId} />}
            {selectedTab.text === tabText.PERMISSIONS && <RoomPermissions roomId={roomId} />}
          </div>
        </div>
      )}
    </PopupWindow>
  );
}

export default SpaceSettings;
