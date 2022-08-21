import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './ProfileViewer.scss';

import { useTranslation } from 'react-i18next';
import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { selectRoom, openReusableContextMenu } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import {
  getUsername, getUsernameOfRoomMember, getPowerLabel, hasDMWith, hasDevices
} from '../../../util/matrixUtil';
import { getEventCords } from '../../../util/common';
import colorMXID from '../../../util/colorMXID';

import Text from '../../atoms/text/Text';
import Chip from '../../atoms/chip/Chip';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import Avatar from '../../atoms/avatar/Avatar';
import Button from '../../atoms/button/Button';
import { MenuItem } from '../../atoms/context-menu/ContextMenu';
import PowerLevelSelector from '../../molecules/power-level-selector/PowerLevelSelector';
import Dialog from '../../molecules/dialog/Dialog';

import ShieldEmptyIC from '../../../../public/res/ic/outlined/shield-empty.svg';
import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';
import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import { confirmDialog } from '../../molecules/confirm-dialog/ConfirmDialog';

import '../../i18n';

function ModerationTools({
  roomId, userId,
}) {
  const { t } = useTranslation();

  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const roomMember = room.getMember(userId);

  const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const powerLevel = roomMember?.powerLevel || 0;
  const canIKick = (
    roomMember?.membership === 'join'
    && room.currentState.hasSufficientPowerLevelFor('kick', myPowerLevel)
    && powerLevel < myPowerLevel
  );
  const canIBan = (
    ['join', 'leave'].includes(roomMember?.membership)
    && room.currentState.hasSufficientPowerLevelFor('ban', myPowerLevel)
    && powerLevel < myPowerLevel
  );

  const handleKick = (e) => {
    e.preventDefault();
    const kickReason = e.target.elements['kick-reason']?.value.trim();
    roomActions.kick(roomId, userId, kickReason !== '' ? kickReason : undefined);
  };

  const handleBan = (e) => {
    e.preventDefault();
    const banReason = e.target.elements['ban-reason']?.value.trim();
    roomActions.ban(roomId, userId, banReason !== '' ? banReason : undefined);
  };

  return (
    <div className="moderation-tools">
      {canIKick && (
        <form onSubmit={handleKick}>
          <Input label={t('Organisms.ProfileViewer.kick_reason_label')} name="kick-reason" />
          <Button type="submit">{t('Organisms.ProfileViewer.kick_button')}</Button>
        </form>
      )}
      {canIBan && (
        <form onSubmit={handleBan}>
          <Input label={t('Organisms.ProfileViewer.ban_reason_label')} name="ban-reason" />
          <Button type="submit">{t('Organisms.ProfileViewer.ban_button')}</Button>
        </form>
      )}
    </div>
  );
}
ModerationTools.propTypes = {
  roomId: PropTypes.string.isRequired,
  userId: PropTypes.string.isRequired,
};

function SessionInfo({ userId }) {
  const [devices, setDevices] = useState(null);
  const [isVisible, setIsVisible] = useState(false);
  const mx = initMatrix.matrixClient;

  const { t } = useTranslation();

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
    if (!isVisible) return null;
    return (
      <div className="session-info__chips">
        {devices === null && <Text variant="b2">{t('Organisms.ProfileViewer.loading_sessions')}</Text>}
        {devices?.length === 0 && <Text variant="b2">{t('Organisms.ProfileViewer.no_sessions_found')}</Text>}
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
      <MenuItem
        onClick={() => setIsVisible(!isVisible)}
        iconSrc={isVisible ? ChevronBottomIC : ChevronRightIC}
      >
        <Text variant="b2">{t('Organisms.ProfileViewer.view_sessions', { count: devices?.length })}</Text>
      </MenuItem>
      {renderSessionChips()}
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
  const { t } = useTranslation();

  const isMountedRef = useRef(true);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const member = room.getMember(userId);
  const isInvitable = member?.membership !== 'join' && member?.membership !== 'ban';

  const [isInviting, setIsInviting] = useState(false);
  const [isInvited, setIsInvited] = useState(member?.membership === 'invite');

  const myPowerlevel = room.getMember(mx.getUserId())?.powerLevel || 0;
  const userPL = room.getMember(userId)?.powerLevel || 0;
  const canIKick = room.currentState.hasSufficientPowerLevelFor('kick', myPowerlevel) && userPL < myPowerlevel;

  const isBanned = member?.membership === 'ban';

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

  const openDM = async () => {
    // Check and open if user already have a DM with userId.
    const dmRoomId = hasDMWith(userId);
    if (dmRoomId) {
      selectRoom(dmRoomId);
      onRequestClose();
      return;
    }

    // Create new DM
    try {
      setIsCreatingDM(true);
      await roomActions.createDM(userId, await hasDevices(userId));
    } catch {
      if (isMountedRef.current === false) return;
      setIsCreatingDM(false);
    }
  };

  const toggleIgnore = async () => {
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
  };

  const toggleInvite = async () => {
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
  };

  return (
    <div className="profile-viewer__buttons">
      <Button
        variant="primary"
        onClick={openDM}
        disabled={isCreatingDM}
      >
        {isCreatingDM ? t('Organisms.ProfileViewer.creating_dm_room') : t('Organisms.ProfileViewer.send_direct_message_button')}
      </Button>
      { isBanned && canIKick && (
        <Button
          variant="positive"
          onClick={() => roomActions.unban(roomId, userId)}
        >
          Unban
        </Button>
      )}
      { (isInvited ? canIKick : room.canInvite(mx.getUserId())) && isInvitable && (
        <Button
          onClick={toggleInvite}
          disabled={isInviting}
        >
          {
            isInvited
              ? `${isInviting ? t('common.uninviting') : t('common.uninvite')}`
              : `${isInviting ? t('common.inviting') : t('common.invite')}`
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
            ? `${isIgnoring ? t('Organisms.ProfileViewer.unignoring') : t('Organisms.ProfileViewer.unignore')}`
            : `${isIgnoring ? t('Organisms.ProfileViewer.ignoring') : t('Organisms.ProfileViewer.ignore')}`
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

function useToggleDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    const loadProfile = (uId, rId) => {
      setIsOpen(true);
      setUserId(uId);
      setRoomId(rId);
    };
    navigation.on(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    return () => {
      navigation.removeListener(cons.events.navigation.PROFILE_VIEWER_OPENED, loadProfile);
    };
  }, []);

  const closeDialog = () => setIsOpen(false);

  const afterClose = () => {
    setUserId(null);
    setRoomId(null);
  };

  return [isOpen, roomId, userId, closeDialog, afterClose];
}

function useRerenderOnProfileChange(roomId, userId) {
  const mx = initMatrix.matrixClient;
  const [, forceUpdate] = useForceUpdate();
  useEffect(() => {
    const handleProfileChange = (mEvent, member) => {
      if (
        mEvent.getRoomId() === roomId
        && (member.userId === userId || member.userId === mx.getUserId())
      ) {
        forceUpdate();
      }
    };
    mx.on('RoomMember.powerLevel', handleProfileChange);
    mx.on('RoomMember.membership', handleProfileChange);
    return () => {
      mx.removeListener('RoomMember.powerLevel', handleProfileChange);
      mx.removeListener('RoomMember.membership', handleProfileChange);
    };
  }, [roomId, userId]);
}

function ProfileViewer() {
  const [isOpen, roomId, userId, closeDialog, handleAfterClose] = useToggleDialog();
  useRerenderOnProfileChange(roomId, userId);

  const { t } = useTranslation();
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);

  const renderProfile = () => {
    const roomMember = room.getMember(userId);
    const username = roomMember ? getUsernameOfRoomMember(roomMember) : getUsername(userId);
    const avatarMxc = roomMember?.getMxcAvatarUrl?.() || mx.getUser(userId)?.avatarUrl;
    const avatarUrl = (avatarMxc && avatarMxc !== 'null') ? mx.mxcUrlToHttp(avatarMxc, 80, 80, 'crop') : null;

    const powerLevel = roomMember?.powerLevel || 0;
    const myPowerLevel = room.getMember(mx.getUserId())?.powerLevel || 0;

    const canChangeRole = (
      room.currentState.maySendEvent('m.room.power_levels', mx.getUserId())
      && (powerLevel < myPowerLevel || userId === mx.getUserId())
    );

    const handleChangePowerLevel = async (newPowerLevel) => {
      if (newPowerLevel === powerLevel) return;
      const SHARED_POWER_MSG = t('Organisms.ProfileViewer.shared_power_message');
      const DEMOTING_MYSELF_MSG = t('Organisms.ProfileViewer.demoting_self_message');

      const isSharedPower = newPowerLevel === myPowerLevel;
      const isDemotingMyself = userId === mx.getUserId();
      if (isSharedPower || isDemotingMyself) {
        const isConfirmed = await confirmDialog(
          t('Organisms.ProfileViewer.change_power_level'),
          isSharedPower ? SHARED_POWER_MSG : DEMOTING_MYSELF_MSG,
          t('common.change'),
          'caution',
        );
        if (!isConfirmed) return;
        roomActions.setPowerLevel(roomId, userId, newPowerLevel);
      } else {
        roomActions.setPowerLevel(roomId, userId, newPowerLevel);
      }
    };

    const handlePowerSelector = (e) => {
      openReusableContextMenu(
        'bottom',
        getEventCords(e, '.btn-surface'),
        (closeMenu) => (
          <PowerLevelSelector
            value={powerLevel}
            max={myPowerLevel}
            onSelect={(pl) => {
              closeMenu();
              handleChangePowerLevel(pl);
            }}
          />
        ),
      );
    };

    return (
      <div className="profile-viewer">
        <div className="profile-viewer__user">
          <Avatar imageSrc={avatarUrl} text={username} bgColor={colorMXID(userId)} size="large" />
          <div className="profile-viewer__user__info">
            <Text variant="s1" weight="medium">{twemojify(username)}</Text>
            <Text variant="b2">{twemojify(userId)}</Text>
          </div>
          <div className="profile-viewer__user__role">
            <Text variant="b3">Role</Text>
            <Button
              onClick={canChangeRole ? handlePowerSelector : null}
              iconSrc={canChangeRole ? ChevronBottomIC : null}
            >
              {`${getPowerLabel(powerLevel) || 'Member'} - ${powerLevel}`}
            </Button>
          </div>
        </div>
        <ModerationTools roomId={roomId} userId={userId} />
        <SessionInfo userId={userId} />
        { userId !== mx.getUserId() && (
          <ProfileFooter roomId={roomId} userId={userId} onRequestClose={closeDialog} />
        )}
      </div>
    );
  };

  return (
    <Dialog
      className="profile-viewer__dialog"
      isOpen={isOpen}
      title={room?.name ?? ''}
      onAfterClose={handleAfterClose}
      onRequestClose={closeDialog}
      contentOptions={<IconButton src={CrossIC} onClick={closeDialog} tooltip={t('common.close')} />}
    >
      {roomId ? renderProfile() : <div />}
    </Dialog>
  );
}

export default ProfileViewer;
