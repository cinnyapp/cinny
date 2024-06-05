import React, { useState, useEffect } from 'react';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import InviteUser from '../invite-user/InviteUser';
import Settings from '../settings/Settings';
import SpaceSettings from '../space-settings/SpaceSettings';
import RoomSettings from '../room/RoomSettings';

function Windows() {
  const [inviteUser, changeInviteUser] = useState({
    isOpen: false,
    roomId: undefined,
    term: undefined,
  });

  function openInviteUser(roomId, searchTerm) {
    changeInviteUser({
      isOpen: true,
      roomId,
      searchTerm,
    });
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
    return () => {
      navigation.removeListener(cons.events.navigation.INVITE_USER_OPENED, openInviteUser);
    };
  }, []);

  return (
    <>
      <InviteUser
        isOpen={inviteUser.isOpen}
        roomId={inviteUser.roomId}
        searchTerm={inviteUser.searchTerm}
        onRequestClose={() => changeInviteUser({ isOpen: false, roomId: undefined })}
      />
      <Settings />
      <SpaceSettings />
      <RoomSettings />
    </>
  );
}

export default Windows;
