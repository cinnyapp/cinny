import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './RoomSettings.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import Text from '../../atoms/text/Text';
import Tabs from '../../atoms/tabs/Tabs';
import { MenuHeader, MenuItem } from '../../atoms/context-menu/ContextMenu';
import RoomProfile from '../../molecules/room-profile/RoomProfile';
import RoomNotification from '../../molecules/room-notification/RoomNotification';
import RoomVisibility from '../../molecules/room-visibility/RoomVisibility';
import RoomAliases from '../../molecules/room-aliases/RoomAliases';
import RoomHistoryVisibility from '../../molecules/room-history-visibility/RoomHistoryVisibility';
import RoomEncryption from '../../molecules/room-encryption/RoomEncryption';
import RoomPermissions from '../../molecules/room-permissions/RoomPermissions';
import RoomMembers from '../../molecules/room-members/RoomMembers';
import RoomEmojis from '../../molecules/room-emojis/RoomEmojis';

import UserIC from '../../../../public/res/ic/outlined/user.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import EmojiIC from '../../../../public/res/ic/outlined/emoji.svg';
import ShieldUserIC from '../../../../public/res/ic/outlined/shield-user.svg';
import LockIC from '../../../../public/res/ic/outlined/lock.svg';
import LeaveArrowIC from '../../../../public/res/ic/outlined/leave-arrow.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import IconButton from '../../atoms/button/IconButton';
import { useMatrixClient } from '../../hooks/useMatrixClient';

const tabText = {
  GENERAL: 'General',
  MEMBERS: 'Members',
  EMOJIS: 'Emojis',
  PERMISSIONS: 'Permissions',
  SECURITY: 'Security',
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
  {
    iconSrc: LockIC,
    text: tabText.SECURITY,
    disabled: false,
  },
];

function GeneralSettings({ roomId }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);

  return (
    <>
      <div className="room-settings__card">
        <MenuHeader>Options</MenuHeader>
        <MenuItem
          variant="danger"
          onClick={async () => {
            const isConfirmed = await confirmDialog(
              'Leave room',
              `Are you sure that you want to leave "${room.name}" room?`,
              'Leave',
              'danger'
            );
            if (!isConfirmed) return;
            mx.leave(roomId);
          }}
          iconSrc={LeaveArrowIC}
        >
          Leave
        </MenuItem>
      </div>
      <div className="room-settings__card">
        <MenuHeader>Notification (Changing this will only affect you)</MenuHeader>
        <RoomNotification roomId={roomId} />
      </div>
      <div className="room-settings__card">
        <MenuHeader>Room visibility (who can join)</MenuHeader>
        <RoomVisibility roomId={roomId} />
      </div>
      <div className="room-settings__card">
        <MenuHeader>Room addresses</MenuHeader>
        <RoomAliases roomId={roomId} />
      </div>
    </>
  );
}

GeneralSettings.propTypes = {
  roomId: PropTypes.string.isRequired,
};

function SecuritySettings({ roomId }) {
  return (
    <>
      <div className="room-settings__card">
        <MenuHeader>Encryption</MenuHeader>
        <RoomEncryption roomId={roomId} />
      </div>
      <div className="room-settings__card">
        <MenuHeader>Message history visibility</MenuHeader>
        <RoomHistoryVisibility roomId={roomId} />
      </div>
    </>
  );
}
SecuritySettings.propTypes = {
  roomId: PropTypes.string.isRequired,
};

function useWindowToggle(setSelectedTab) {
  const [window, setWindow] = useState(null);

  useEffect(() => {
    const openRoomSettings = (roomId, tab) => {
      setWindow({ roomId, tabText });
      const tabItem = tabItems.find((item) => item.text === tab);
      if (tabItem) setSelectedTab(tabItem);
    };
    navigation.on(cons.events.navigation.ROOM_SETTINGS_TOGGLED, openRoomSettings);
    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SETTINGS_TOGGLED, openRoomSettings);
    };
  }, [setSelectedTab]);

  const requestClose = () => setWindow(null);

  return [window, requestClose];
}

function RoomSettings() {
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
      className="room-settings"
      title={
        <Text variant="s1" weight="medium" primary>
          {isOpen && room.name}
          <span style={{ color: 'var(--tc-surface-low)' }}> — room settings</span>
        </Text>
      }
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {isOpen && (
        <div className="room-settings__content">
          <RoomProfile roomId={roomId} />
          <Tabs
            items={tabItems}
            defaultSelected={tabItems.findIndex((tab) => tab.text === selectedTab.text)}
            onSelect={handleTabChange}
          />
          <div className="room-settings__cards-wrapper">
            {selectedTab.text === tabText.GENERAL && <GeneralSettings roomId={roomId} />}
            {selectedTab.text === tabText.MEMBERS && <RoomMembers roomId={roomId} />}
            {selectedTab.text === tabText.EMOJIS && <RoomEmojis roomId={roomId} />}
            {selectedTab.text === tabText.PERMISSIONS && <RoomPermissions roomId={roomId} />}
            {selectedTab.text === tabText.SECURITY && <SecuritySettings roomId={roomId} />}
          </div>
        </div>
      )}
    </PopupWindow>
  );
}

export default RoomSettings;
export { tabText };
