import React, { useState, useEffect } from 'react';
import './SideBar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';
import logout from '../../../client/action/logout';
import {
  selectTab, openInviteList, openSearch, openSettings,
} from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';
import { abbreviateNumber } from '../../../util/common';

import ScrollView from '../../atoms/scroll/ScrollView';
import SidebarAvatar from '../../molecules/sidebar-avatar/SidebarAvatar';
import ContextMenu, { MenuItem, MenuHeader, MenuBorder } from '../../atoms/context-menu/ContextMenu';

import HomeIC from '../../../../public/res/ic/outlined/home.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import InviteIC from '../../../../public/res/ic/outlined/invite.svg';
import SettingsIC from '../../../../public/res/ic/outlined/settings.svg';
import PowerIC from '../../../../public/res/ic/outlined/power.svg';

function ProfileAvatarMenu() {
  const mx = initMatrix.matrixClient;
  const [profile, setProfile] = useState({
    avatarUrl: null,
    displayName: mx.getUser(mx.getUserId()).displayName,
  });

  useEffect(() => {
    const user = mx.getUser(mx.getUserId());
    const setNewProfile = (avatarUrl, displayName) => setProfile({
      avatarUrl: avatarUrl || null,
      displayName: displayName || profile.displayName,
    });
    const onAvatarChange = (event, myUser) => {
      setNewProfile(myUser.avatarUrl, myUser.displayName);
    };
    mx.getProfileInfo(mx.getUserId()).then((info) => {
      setNewProfile(info.avatar_url, info.displayname);
    });
    user.on('User.avatarUrl', onAvatarChange);
    return () => {
      user.removeListener('User.avatarUrl', onAvatarChange);
    };
  }, []);

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
          tooltip={profile.displayName}
          imageSrc={profile.avatarUrl !== null ? mx.mxcUrlToHttp(profile.avatarUrl, 42, 42, 'crop') : null}
          bgColor={colorMXID(mx.getUserId())}
          text={profile.displayName}
        />
      )}
    />
  );
}

function SideBar() {
  const { roomList, notifications } = initMatrix;
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
  function onNotificationChanged(roomId, total, prevTotal) {
    if (total === prevTotal) return;
    forceUpdate({});
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.TAB_SELECTED, onTabSelected);
    roomList.on(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
    roomList.on(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
    notifications.on(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);

    return () => {
      navigation.removeListener(cons.events.navigation.TAB_SELECTED, onTabSelected);
      roomList.removeListener(cons.events.roomList.SPACE_SHORTCUT_UPDATED, onSpaceShortcutUpdated);
      roomList.removeListener(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);
    };
  }, []);

  function getHomeNoti() {
    const orphans = roomList.getOrphans();
    let noti = null;

    orphans.forEach((roomId) => {
      if (roomList.spaceShortcut.has(roomId)) return;
      if (!notifications.hasNoti(roomId)) return;
      if (noti === null) noti = { total: 0, highlight: 0 };
      const childNoti = notifications.getNoti(roomId);
      noti.total += childNoti.total;
      noti.highlight += childNoti.highlight;
    });

    return noti;
  }
  function getDMsNoti() {
    if (roomList.directs.size === 0) return null;
    let noti = null;

    [...roomList.directs].forEach((roomId) => {
      if (!notifications.hasNoti(roomId)) return;
      if (noti === null) noti = { total: 0, highlight: 0 };
      const childNoti = notifications.getNoti(roomId);
      noti.total += childNoti.total;
      noti.highlight += childNoti.highlight;
    });

    return noti;
  }

  // TODO: bellow operations are heavy.
  // refactor this component into more smaller components.
  const dmsNoti = getDMsNoti();
  const homeNoti = getHomeNoti();

  return (
    <div className="sidebar">
      <div className="sidebar__scrollable">
        <ScrollView invisible>
          <div className="scrollable-content">
            <div className="featured-container">
              <SidebarAvatar
                active={selectedTab === cons.tabs.HOME}
                onClick={() => selectTab(cons.tabs.HOME)}
                tooltip="Home"
                iconSrc={HomeIC}
                isUnread={homeNoti !== null}
                notificationCount={homeNoti !== null ? abbreviateNumber(homeNoti.total) : 0}
                isAlert={homeNoti?.highlight > 0}
              />
              <SidebarAvatar
                active={selectedTab === cons.tabs.DIRECTS}
                onClick={() => selectTab(cons.tabs.DIRECTS)}
                tooltip="People"
                iconSrc={UserIC}
                isUnread={dmsNoti !== null}
                notificationCount={dmsNoti !== null ? abbreviateNumber(dmsNoti.total) : 0}
                isAlert={dmsNoti?.highlight > 0}
              />
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
                      text={room.name}
                      isUnread={notifications.hasNoti(sRoomId)}
                      notificationCount={abbreviateNumber(notifications.getTotalNoti(sRoomId))}
                      isAlert={notifications.getHighlightNoti(sRoomId) !== 0}
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
          <SidebarAvatar
            onClick={() => openSearch()}
            tooltip="Search"
            iconSrc={SearchIC}
          />
          { totalInvites !== 0 && (
            <SidebarAvatar
              isUnread
              notificationCount={totalInvites}
              isAlert
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
