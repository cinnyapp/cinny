import React, { useState, useEffect } from 'react';
import './SideBar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';
import {
  selectTab, openShortcutSpaces, openInviteList,
  openSearch, openSettings, openReusableContextMenu,
} from '../../../client/action/navigation';
import { abbreviateNumber, getEventCords } from '../../../util/common';

import Avatar from '../../atoms/avatar/Avatar';
import NotificationBadge from '../../atoms/badge/NotificationBadge';
import ScrollView from '../../atoms/scroll/ScrollView';
import SidebarAvatar from '../../molecules/sidebar-avatar/SidebarAvatar';
import SpaceOptions from '../../molecules/space-options/SpaceOptions';

import HomeIC from '../../../../public/res/ic/outlined/home.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import AddPinIC from '../../../../public/res/ic/outlined/add-pin.svg';
import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import InviteIC from '../../../../public/res/ic/outlined/invite.svg';

import { useSelectedTab } from '../../hooks/useSelectedTab';
import { useSpaceShortcut } from '../../hooks/useSpaceShortcut';

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
    <SidebarAvatar
      onClick={openSettings}
      tooltip={profile.displayName}
      avatar={(
        <Avatar
          text={profile.displayName}
          bgColor={colorMXID(mx.getUserId())}
          size="normal"
          imageSrc={profile.avatarUrl !== null ? mx.mxcUrlToHttp(profile.avatarUrl, 42, 42, 'crop') : null}
        />
      )}
    />
  );
}

function useTotalInvites() {
  const { roomList } = initMatrix;
  const totalInviteCount = () => roomList.inviteRooms.size
    + roomList.inviteSpaces.size
    + roomList.inviteDirects.size;
  const [totalInvites, updateTotalInvites] = useState(totalInviteCount());

  useEffect(() => {
    const onInviteListChange = () => {
      updateTotalInvites(totalInviteCount());
    };
    roomList.on(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
    return () => {
      roomList.removeListener(cons.events.roomList.INVITELIST_UPDATED, onInviteListChange);
    };
  }, []);

  return [totalInvites];
}

function SideBar() {
  const { roomList, accountData, notifications } = initMatrix;
  const mx = initMatrix.matrixClient;

  const [selectedTab] = useSelectedTab();
  const [spaceShortcut] = useSpaceShortcut();
  const [totalInvites] = useTotalInvites();
  const [, forceUpdate] = useState({});

  useEffect(() => {
    function onNotificationChanged(roomId, total, prevTotal) {
      if (total === prevTotal) return;
      forceUpdate({});
    }
    notifications.on(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);
    return () => {
      notifications.removeListener(cons.events.notifications.NOTI_CHANGED, onNotificationChanged);
    };
  }, []);

  const openSpaceOptions = (e, spaceId) => {
    e.preventDefault();
    openReusableContextMenu(
      'right',
      getEventCords(e, '.sidebar-avatar'),
      (closeMenu) => <SpaceOptions roomId={spaceId} afterOptionSelect={closeMenu} />,
    );
  };

  function getHomeNoti() {
    const orphans = roomList.getOrphans();
    let noti = null;

    orphans.forEach((roomId) => {
      if (accountData.spaceShortcut.has(roomId)) return;
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
                tooltip="Home"
                active={selectedTab === cons.tabs.HOME}
                onClick={() => selectTab(cons.tabs.HOME)}
                avatar={<Avatar iconSrc={HomeIC} size="normal" />}
                notificationBadge={homeNoti ? (
                  <NotificationBadge
                    alert={homeNoti?.highlight > 0}
                    content={abbreviateNumber(homeNoti.total) || null}
                  />
                ) : null}
              />
              <SidebarAvatar
                tooltip="People"
                active={selectedTab === cons.tabs.DIRECTS}
                onClick={() => selectTab(cons.tabs.DIRECTS)}
                avatar={<Avatar iconSrc={UserIC} size="normal" />}
                notificationBadge={dmsNoti ? (
                  <NotificationBadge
                    alert={dmsNoti?.highlight > 0}
                    content={abbreviateNumber(dmsNoti.total) || null}
                  />
                ) : null}
              />
            </div>
            <div className="sidebar-divider" />
            <div className="space-container">
              {
                spaceShortcut.map((shortcut) => {
                  const sRoomId = shortcut;
                  const room = mx.getRoom(sRoomId);
                  return (
                    <SidebarAvatar
                      active={selectedTab === sRoomId}
                      key={sRoomId}
                      tooltip={room.name}
                      onClick={() => selectTab(shortcut)}
                      onContextMenu={(e) => openSpaceOptions(e, sRoomId)}
                      avatar={(
                        <Avatar
                          text={room.name}
                          bgColor={colorMXID(room.roomId)}
                          size="normal"
                          imageSrc={room.getAvatarUrl(initMatrix.matrixClient.baseUrl, 42, 42, 'crop') || null}
                        />
                      )}
                      notificationBadge={notifications.hasNoti(sRoomId) ? (
                        <NotificationBadge
                          alert={notifications.getHighlightNoti(sRoomId) > 0}
                          content={abbreviateNumber(notifications.getTotalNoti(sRoomId)) || null}
                        />
                      ) : null}
                    />
                  );
                })
              }
              <SidebarAvatar
                tooltip="Pin spaces"
                onClick={() => openShortcutSpaces()}
                avatar={<Avatar iconSrc={AddPinIC} size="normal" />}
              />
            </div>
          </div>
        </ScrollView>
      </div>
      <div className="sidebar__sticky">
        <div className="sidebar-divider" />
        <div className="sticky-container">
          <SidebarAvatar
            tooltip="Search"
            onClick={() => openSearch()}
            avatar={<Avatar iconSrc={SearchIC} size="normal" />}
          />
          { totalInvites !== 0 && (
            <SidebarAvatar
              tooltip="Invites"
              onClick={() => openInviteList()}
              avatar={<Avatar iconSrc={InviteIC} size="normal" />}
              notificationBadge={<NotificationBadge alert content={totalInvites} />}
            />
          )}
          <ProfileAvatarMenu />
        </div>
      </div>
    </div>
  );
}

export default SideBar;
