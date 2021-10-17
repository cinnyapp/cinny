import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';

import { getUsername, getUsernameOfRoomMember, getPowerLabel } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Chip from '../../atoms/chip/Chip';
import IconButton from '../../atoms/button/IconButton';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import Dialog from '../../molecules/dialog/Dialog';
import SettingTile from '../../molecules/setting-tile/SettingTile';

import ShieldEmptyIC from '../../../../public/res/ic/outlined/shield-empty.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

function SessionInfo({ userId }) {
  const [devices, setDevices] = useState(null);
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    let isUnmounted = false;

    async function loadDevices() {
      try {
        await mx.downloadKeys([userId], true);
        const myDevices = mx.getStoredDevicesForUser(userId);

        if (isUnmounted) return;
        setDevices(myDevices);
      } catch {
        setDevices([]);
      }
    }
    loadDevices();

    return () => {
      isUnmounted = true;
    };
  }, [userId]);

  function renderSessionChips() {
    return (
      <div className="session-info__chips">
        {devices === null && <Text variant="b3">Loading sessions...</Text>}
        {devices?.length === 0 && <Text variant="b3">No session found.</Text>}
        {devices !== null && (devices.map((device) => (
          <Chip
            key={device.deviceId}
            iconSrc={ShieldEmptyIC}
            text={device.getDisplayName() || device.deviceId}
          />
        )))}
      </div>
    );
  }

  return (
    <div className="session-info">
      <SettingTile
        title="Sessions"
        content={renderSessionChips()}
      />
    </div>
  );
}

SessionInfo.propTypes = {
  userId: PropTypes.string.isRequired,
};

function ProfileViewer() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [userId, setUserId] = useState(null);

  const mx = initMatrix.matrixClient;
  const room = roomId ? mx.getRoom(roomId) : null;
  let username = '';
  if (room !== null) {
    const roomMember = room.getMember(userId);
    if (roomMember) username = getUsernameOfRoomMember(roomMember);
    else username = getUsername(userId);
  }

  function loadProfile(uId, rId) {
    setIsOpen(true);
    setUserId(uId);
    setRoomId(rId);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    return () => {
      navigation.removeListener(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    };
  }, []);

  useEffect(() => {
    if (isOpen) return;
    setUserId(null);
    setRoomId(null);
  }, [isOpen]);

  function renderProfile() {
    const member = room.getMember(userId) || mx.getUser(userId);
    const avatarMxc = member.getMxcAvatarUrl() || member.avatarUrl;

    return (
      <div className="profile-viewer">
        <div className="profile-viewer__user">
          <Avatar
            imageSrc={!avatarMxc ? null : mx.mxcUrlToHttp(avatarMxc, 80, 80, 'crop')}
            text={username.slice(0, 1)}
            bgColor={colorMXID(userId)}
            size="large"
          />
          <div className="profile-viewer__user__info">
            <Text variant="s1">{username}</Text>
            <Text variant="b2">{userId}</Text>
          </div>
          <div className="profile-viewer__user__role">
            <Text variant="b3">Role</Text>
            <Button iconSrc={ChevronBottomIC}>{getPowerLabel(member.powerLevel) || 'Member'}</Button>
          </div>
        </div>
        <SessionInfo userId={userId} />
        <div className="profile-viewer__buttons">
          <Button variant="primary">Message</Button>
          <Button>Mention</Button>
          <Button variant="danger">
            {false ? 'Unignore' : 'Ignore'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Dialog
      className="profile-viewer__dialog"
      isOpen={isOpen}
      title={`${username} in ${room?.name ?? ''}`}
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip="Close" />}
    >
      {isOpen && renderProfile()}
    </Dialog>
  );
}

export default ProfileViewer;
