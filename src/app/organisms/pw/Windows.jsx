import React, { useState, useEffect } from 'react';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import InviteList from '../invite-list/InviteList';
import PublicRooms from '../public-rooms/PublicRooms';
import CreateRoom from '../create-room/CreateRoom';
import InviteUser from '../invite-user/InviteUser';
import Settings from '../settings/Settings';
import SpaceSettings from '../space-settings/SpaceSettings';
import SpaceManage from '../space-manage/SpaceManage';

function Windows() {
  const [isInviteList, changeInviteList] = useState(false);
  const [publicRooms, changePublicRooms] = useState({
    isOpen: false, searchTerm: undefined,
  });
  const [isCreateRoom, changeCreateRoom] = useState(false);
  const [inviteUser, changeInviteUser] = useState({
    isOpen: false, roomId: undefined, term: undefined,
  });
  const [settings, changeSettings] = useState(false);

  function openInviteList() {
    changeInviteList(true);
  }
  function openPublicRooms(searchTerm) {
    changePublicRooms({
      isOpen: true,
      searchTerm,
    });
  }
  function openCreateRoom() {
    changeCreateRoom(true);
  }
  function openInviteUser(roomId, searchTerm) {
    changeInviteUser({
      isOpen: true,
      roomId,
      searchTerm,
    });
  }
  function openSettings() {
    changeSettings(true);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.INVITE_LIST_OPENED, openInviteList);
    navigation.on(cons.events.navigation.PUBLIC_ROOMS_OPENED, openPublicRooms);
    navigation.on(cons.events.navigation.CREATE_ROOM_OPENED, openCreateRoom);
    navigation.on(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
    navigation.on(cons.events.navigation.SETTINGS_OPENED, openSettings);
    return () => {
      navigation.removeListener(cons.events.navigation.INVITE_LIST_OPENED, openInviteList);
      navigation.removeListener(cons.events.navigation.PUBLIC_ROOMS_OPENED, openPublicRooms);
      navigation.removeListener(cons.events.navigation.CREATE_ROOM_OPENED, openCreateRoom);
      navigation.removeListener(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
      navigation.removeListener(cons.events.navigation.SETTINGS_OPENED, openSettings);
    };
  }, []);

  return (
    <>
      <InviteList
        isOpen={isInviteList}
        onRequestClose={() => changeInviteList(false)}
      />
      <PublicRooms
        isOpen={publicRooms.isOpen}
        searchTerm={publicRooms.searchTerm}
        onRequestClose={() => changePublicRooms({ isOpen: false, searchTerm: undefined })}
      />
      <CreateRoom
        isOpen={isCreateRoom}
        onRequestClose={() => changeCreateRoom(false)}
      />
      <InviteUser
        isOpen={inviteUser.isOpen}
        roomId={inviteUser.roomId}
        searchTerm={inviteUser.searchTerm}
        onRequestClose={() => changeInviteUser({ isOpen: false, roomId: undefined })}
      />
      <Settings
        isOpen={settings}
        onRequestClose={() => changeSettings(false)}
      />
      <SpaceSettings />
      <SpaceManage />
    </>
  );
}

export default Windows;
