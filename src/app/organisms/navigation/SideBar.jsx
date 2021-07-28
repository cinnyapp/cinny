import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SideBar.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import colorMXID from '../../../util/colorMXID';
import logout from '../../../client/action/logout';
import { openInviteList, openPublicChannels, openSettings } from '../../../client/action/navigation';

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

function SideBar({ tabId, changeTab }) {
  const totalInviteCount = () => initMatrix.roomList.inviteRooms.size
    + initMatrix.roomList.inviteSpaces.size
    + initMatrix.roomList.inviteDirects.size;

  const [totalInvites, updateTotalInvites] = useState(totalInviteCount());

  function onInviteListChange() {
    updateTotalInvites(totalInviteCount());
  }

  useEffect(() => {
    initMatrix.roomList.on(
      cons.events.roomList.INVITELIST_UPDATED,
      onInviteListChange,
    );

    return () => {
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
              <SidebarAvatar active={tabId === 'channels'} onClick={() => changeTab('channels')} tooltip="Home" iconSrc={HomeIC} />
              <SidebarAvatar active={tabId === 'dm'} onClick={() => changeTab('dm')} tooltip="People" iconSrc={UserIC} />
              <SidebarAvatar onClick={() => openPublicChannels()} tooltip="Public channels" iconSrc={HashSearchIC} />
            </div>
            <div className="sidebar-divider" />
            <div className="space-container" />
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

SideBar.propTypes = {
  tabId: PropTypes.string.isRequired,
  changeTab: PropTypes.func.isRequired,
};

export default SideBar;
