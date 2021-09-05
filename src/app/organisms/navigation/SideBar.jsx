import React, { useState, useEffect } from 'react';
import './SideBar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';
import logout from '../../../client/action/logout';
import {
  selectTab, openInviteList, openPublicRooms, openSettings,
} from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';

import ScrollView from '../../atoms/scroll/ScrollView';
import SidebarAvatar from '../../molecules/sidebar-avatar/SidebarAvatar';
import ContextMenu, { MenuItem, MenuHeader, MenuBorder } from '../../atoms/context-menu/ContextMenu';

import HomeIC from '../../../../public/res/ic/outlined/home.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import InviteIC from '../../../../public/res/ic/outlined/invite.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import PowerIC from '../../../../public/res/ic/outlined/power.svg';

function ProfileAvatarMenu() {
  const mx = initMatrix.matrixClient;

  return (
    <ContextMenu
      content={(hideMenu) => (
        <>
          <MenuHeader>{mx.getUserId()}</MenuHeader>
          {/* <MenuItem iconSrc={UserIC} onClick={() => ''}>Profile</MenuItem> */}
          {/* <MenuItem iconSrc={BellIC} onClick={() => ''}>Notification settings</MenuItem> */}
          <MenuItem
            iconSrc={SettingsIC}
            onClick={() => { hideMenu(); openSettings(); }}
          >
            Settings
          </MenuItem>
          <MenuBorder />
          <MenuItem iconSrc={PowerIC} variant="danger" onClick={logout}>Logout</MenuItem>
        </>
      )}
      render={(toggleMenu) => (
        <SidebarAvatar
          onClick={toggleMenu}
          tooltip={mx.getUser(mx.getUserId()).displayName}
          imageSrc={mx.getUser(mx.getUserId()).avatarUrl !== null ? mx.mxcUrlToHttp(mx.getUser(mx.getUserId()).avatarUrl, 42, 42, 'crop') : null}
          bgColor={colorMXID(mx.getUserId())}
          text={mx.getUser(mx.getUserId()).displayName.slice(0, 1)}
        />
      )}
    />
  );
}

function SideBar() {
  const { roomList } = initMatrix;
  const mx = initMatrix.matrixClient;
  const totalInviteCount = () => roomList.inviteRooms.size
    + roomList.inviteSpaces.size
    + roomList.inviteDirects.size;

  const [totalInvites, updateTotalInvites] = useState(totalInviteCount());
  const [selectedTab, setSelectedTab] = useState(navigation.selectedTab);
  const [, forceUpdate] = useState({});

  function onTabSelected(tabId) {
    setSelectedTab(tabId);
  }
  function onInviteListChange() {
    updateTotalInvites(totalInviteCount());
  }
  function onSpaceShortcutUpdated() {
    forceUpdate({});
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.TAB_SELECTED, onTabSelected);
    roomList.on(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
    initMatrix.roomList.on(
      cons.events.roomList.INVITELIST_UPDATED,
      onInviteListChange,
    );

    return () => {
      navigation.removeListener(cons.events.navigation.TAB_SELECTED, onTabSelected);
      roomList.removeListener(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
      initMatrix.roomList.removeListener(
        cons.events.roomList.INVITELIST_UPDATED,
        onInviteListChange,
      );
    };
  }, []);

  return (
    <div className="sidebar">
      <div className="sidebar__scrollable">
        <ScrollView invisible>
          <div className="scrollable-content">
            <div className="featured-container">
              <SidebarAvatar active={selectedTab === cons.tabs.HOME} onClick={() => selectTab(cons.tabs.HOME)} tooltip="Home" iconSrc={HomeIC} />
              <SidebarAvatar active={selectedTab === cons.tabs.DIRECTS} onClick={() => selectTab(cons.tabs.DIRECTS)} tooltip="People" iconSrc={UserIC} />
              <SidebarAvatar onClick={() => openPublicRooms()} tooltip="Public rooms" iconSrc={HashSearchIC} />
            </div>
            <div className="sidebar-divider" />
            <div className="space-container">
              {
                [...roomList.spaceShortcut].map((shortcut) => {
                  const sRoomId = shortcut;
                  const room = mx.getRoom(sRoomId);
                  return (
                    <SidebarAvatar
                      active={selectedTab === sRoomId}
                      key={sRoomId}
                      tooltip={room.name}
                      bgColor={colorMXID(room.roomId)}
                      imageSrc={room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 42, 42, 'crop') || null}
                      text={room.name.slice(0, 1)}
                      onClick={() => selectTab(shortcut)}
                    />
                  );
                })
              }
            </div>
          </div>
        </ScrollView>
      </div>
      <div className="sidebar__sticky">
        <div className="sidebar-divider" />
        <div className="sticky-container">
          { totalInvites !== 0 && (
            <SidebarAvatar
              notifyCount={totalInvites}
              onClick={() => openInviteList()}
              tooltip="Invites"
              iconSrc={InviteIC}
            />
          )}
          <ProfileAvatarMenu />
        </div>
      </div>
    </div>
  );
}

export default SideBar;
