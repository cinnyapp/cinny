import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

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

function ProfileFooter({ roomId, userId, onRequestClose }) {
  const [isCreatingDM, setIsCreatingDM] = useState(false);
  const [isIgnoring, setIsIgnoring] = useState(false);
  const [isUserIgnored, setIsUserIgnored] = useState(initMatrix.matrixClient.isUserIgnored(userId));

  const isMountedRef = useRef(true);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const member = room.getMember(userId);
  const isInvitable = member?.membership !== 'join' && member?.membership !== 'ban';

  const [isInviting, setIsInviting] = useState(false);
  const [isInvited, setIsInvited] = useState(member?.membership === 'invite');

  const myPowerlevel = room.getMember(mx.getUserId()).powerLevel;
  const userPL = room.getMember(userId)?.powerLevel || 0;
  const canIKick = room.currentState.hasSufficientPowerLevelFor('kick', myPowerlevel) && userPL < myPowerlevel;

  const onCreated = (dmRoomId) => {
    if (isMountedRef.current === false) return;
    setIsCreatingDM(false);
    selectRoom(dmRoomId);
    onRequestClose();
  };

  useEffect(() => {
    const { roomList } = initMatrix;
    roomList.on(cons.events.roomList.ROOM_CREATED, onCreated);
    return () => {
      isMountedRef.current = false;
      roomList.removeListener(cons.events.roomList.ROOM_CREATED, onCreated);
    };
  }, []);
  useEffect(() => {
    setIsUserIgnored(initMatrix.matrixClient.isUserIgnored(userId));
    setIsIgnoring(false);
    setIsInviting(false);
  }, [userId]);

  async function openDM() {
    const directIds = [...initMatrix.roomList.directs];

    // Check and open if user already have a DM with userId.
    for (let i = 0; i < directIds.length; i += 1) {
      const dRoom = mx.getRoom(directIds[i]);
      const roomMembers = dRoom.getMembers();
      if (roomMembers.length <= 2 && dRoom.getMember(userId)) {
        selectRoom(directIds[i]);
        onRequestClose();
        return;
      }
    }

    // Create new DM
    try {
      setIsCreatingDM(true);
      await roomActions.create({
        isEncrypted: true,
        isDirect: true,
        invite: [userId],
      });
    } catch {
      if (isMountedRef.current === false) return;
      setIsCreatingDM(false);
    }
  }

  async function toggleIgnore() {
    const ignoredUsers = mx.getIgnoredUsers();
    const uIndex = ignoredUsers.indexOf(userId);
    if (uIndex >= 0) {
      if (uIndex === -1) return;
      ignoredUsers.splice(uIndex, 1);
    } else ignoredUsers.push(userId);

    try {
      setIsIgnoring(true);
      await mx.setIgnoredUsers(ignoredUsers);

      if (isMountedRef.current === false) return;
      setIsUserIgnored(uIndex < 0);
      setIsIgnoring(false);
    } catch {
      setIsIgnoring(false);
    }
  }

  async function toggleInvite() {
    try {
      setIsInviting(true);
      let isInviteSent = false;
      if (isInvited) await roomActions.kick(roomId, userId);
      else {
        await roomActions.invite(roomId, userId);
        isInviteSent = true;
      }
      if (isMountedRef.current === false) return;
      setIsInvited(isInviteSent);
      setIsInviting(false);
    } catch {
      setIsInviting(false);
    }
  }

  return (
    <div className="profile-viewer__buttons">
      <Button
        variant="primary"
        onClick={openDM}
        disabled={isCreatingDM}
      >
        {isCreatingDM ? 'Creating room...' : 'Message'}
      </Button>
      { member?.membership === 'join' && <Button>Mention</Button>}
      { (isInvited ? canIKick : room.canInvite(mx.getUserId())) && isInvitable && (
        <Button
          onClick={toggleInvite}
          disabled={isInviting}
        >
          {
            isInvited
              ? `${isInviting ? 'Disinviting...' : 'Disinvite'}`
              : `${isInviting ? 'Inviting...' : 'Invite'}`
          }
        </Button>
      )}
      <Button
        variant={isUserIgnored ? 'positive' : 'danger'}
        onClick={toggleIgnore}
        disabled={isIgnoring}
      >
        {
          isUserIgnored
            ? `${isIgnoring ? 'Unignoring...' : 'Unignore'}`
            : `${isIgnoring ? 'Ignoring...' : 'Ignore'}`
        }
      </Button>
    </div>
  );
}
ProfileFooter.propTypes = {
  roomId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
  onRequestClose: PropTypes.func.isRequired,
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

  const handleAfterClose = () => {
    setUserId(null);
    setRoomId(null);
  };

  function renderProfile() {
    const member = room.getMember(userId) || mx.getUser(userId) || {};
    const avatarMxc = member.getMxcAvatarUrl?.() || member.avatarUrl;
    const canChangeRole = room.currentState.maySendEvent('m.room.power_levels', mx.getUserId());

    return (
      <div className="profile-viewer">
        <div className="profile-viewer__user">
          <Avatar
            imageSrc={!avatarMxc ? null : mx.mxcUrlToHttp(avatarMxc, 80, 80, 'crop')}
            text={username}
            bgColor={colorMXID(userId)}
            size="large"
          />
          <div className="profile-viewer__user__info">
            <Text variant="s1" weight="medium">{twemojify(username)}</Text>
            <Text variant="b2">{twemojify(userId)}</Text>
          </div>
          <div className="profile-viewer__user__role">
            <Text variant="b3">Role</Text>
            <Button iconSrc={canChangeRole ? ChevronBottomIC : null}>{getPowerLabel(member.powerLevel) || 'Member'}</Button>
          </div>
        </div>
        <SessionInfo userId={userId} />
        { userId !== mx.getUserId() && (
          <ProfileFooter
            roomId={roomId}
            userId={userId}
            onRequestClose={() => setIsOpen(false)}
          />
        )}
      </div>
    );
  }

  return (
    <Dialog
      className="profile-viewer__dialog"
      isOpen={isOpen}
      title={`${username} in ${room?.name ?? ''}`}
      onAfterClose={handleAfterClose}
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip="Close" />}
    >
      {roomId ? renderProfile() : <div />}
    </Dialog>
  );
}

export default ProfileViewer;
