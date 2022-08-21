import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './InviteUser.scss';

import { useTranslation } from 'react-i18next';
import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import * as roomActions from '../../../client/action/room';
import { selectRoom } from '../../../client/action/navigation';
import { hasDMWith, hasDevices } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';

import '../../i18n';

function InviteUser({
  isOpen, roomId, searchTerm, onRequestClose,
}) {
  const [isSearching, updateIsSearching] = useState(false);
  const [searchQuery, updateSearchQuery] = useState({});
  const [users, updateUsers] = useState([]);

  const [procUsers, updateProcUsers] = useState(new Set()); // proc stands for processing.
  const [procUserError, updateUserProcError] = useState(new Map());

  const [createdDM, updateCreatedDM] = useState(new Map());
  const [roomIdToUserId, updateRoomIdToUserId] = useState(new Map());

  const [invitedUserIds, updateInvitedUserIds] = useState(new Set());

  const usernameRef = useRef(null);

  const { t } = useTranslation();

  const mx = initMatrix.matrixClient;

  function getMapCopy(myMap) {
    const newMap = new Map();
    myMap.forEach((data, key) => {
      newMap.set(key, data);
    });
    return newMap;
  }
  function addUserToProc(userId) {
    procUsers.add(userId);
    updateProcUsers(new Set(Array.from(procUsers)));
  }
  function deleteUserFromProc(userId) {
    procUsers.delete(userId);
    updateProcUsers(new Set(Array.from(procUsers)));
  }

  function onDMCreated(newRoomId) {
    const myDMPartnerId = roomIdToUserId.get(newRoomId);
    if (typeof myDMPartnerId === 'undefined') return;

    createdDM.set(myDMPartnerId, newRoomId);
    roomIdToUserId.delete(newRoomId);

    deleteUserFromProc(myDMPartnerId);
    updateCreatedDM(getMapCopy(createdDM));
    updateRoomIdToUserId(getMapCopy(roomIdToUserId));
  }

  async function searchUser(username) {
    const inputUsername = username.trim();
    if (isSearching || inputUsername === '' || inputUsername === searchQuery.username) return;
    const isInputUserId = inputUsername[0] === '@' && inputUsername.indexOf(':') > 1;
    updateIsSearching(true);
    updateSearchQuery({ username: inputUsername });

    if (isInputUserId) {
      try {
        const result = await mx.getProfileInfo(inputUsername);
        updateUsers([{
          user_id: inputUsername,
          display_name: result.displayname,
          avatar_url: result.avatar_url,
        }]);
      } catch (e) {
        updateSearchQuery({ error: t('Organisms.InviteUser.user_not_found', { user_name: inputUsername }) });
      }
    } else {
      try {
        const result = await mx.searchUserDirectory({
          term: inputUsername,
          limit: 20,
        });
        if (result.results.length === 0) {
          updateSearchQuery({ error: t('Organisms.InviteUser.no_matches_found', { user_name: inputUsername }) });
          updateIsSearching(false);
          return;
        }
        updateUsers(result.results);
      } catch (e) {
        updateSearchQuery({ error: t('errors.generic') });
      }
    }
    updateIsSearching(false);
  }

  async function createDM(userId) {
    if (mx.getUserId() === userId) return;
    const dmRoomId = hasDMWith(userId);
    if (dmRoomId) {
      selectRoom(dmRoomId);
      onRequestClose();
      return;
    }

    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      const result = await roomActions.createDM(userId, await hasDevices(userId));
      roomIdToUserId.set(result.room_id, userId);
      updateRoomIdToUserId(getMapCopy(roomIdToUserId));
    } catch (e) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, t('errors.generic'));
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  async function inviteToRoom(userId) {
    if (typeof roomId === 'undefined') return;
    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      await roomActions.invite(roomId, userId);

      invitedUserIds.add(userId);
      updateInvitedUserIds(new Set(Array.from(invitedUserIds)));
      deleteUserFromProc(userId);
    } catch (e) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, t('errors.generic'));
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  function renderUserList() {
    const renderOptions = (userId) => {
      const messageJSX = (message, isPositive) => <Text variant="b2"><span style={{ color: isPositive ? 'var(--bg-positive)' : 'var(--bg-negative)' }}>{message}</span></Text>;

      if (mx.getUserId() === userId) return null;
      if (procUsers.has(userId)) {
        return <Spinner size="small" />;
      }
      if (createdDM.has(userId)) {
        // eslint-disable-next-line max-len
        return <Button onClick={() => { selectRoom(createdDM.get(userId)); onRequestClose(); }}>Open</Button>;
      }
      if (invitedUserIds.has(userId)) {
        return messageJSX(t('Organisms.InviteUser.invite_result.invited'), true);
      }
      if (typeof roomId === 'string') {
        const member = mx.getRoom(roomId).getMember(userId);
        if (member !== null) {
          const userMembership = member.membership;
          switch (userMembership) {
            case 'join':
              return messageJSX(t('Organisms.InviteUser.invite_result.already_joined'), true);
            case 'invite':
              return messageJSX(t('Organisms.InviteUser.invite_result.already_invited'), true);
            case 'ban':
              return messageJSX(t('Organisms.InviteUser.invite_result.banned'), false);
            default:
          }
        }
      }
      return (typeof roomId === 'string')
        ? <Button onClick={() => inviteToRoom(userId)} variant="primary">{t('common.invite')}</Button>
        : <Button onClick={() => createDM(userId)} variant="primary">{t('common.message_prompt')}</Button>;
    };
    const renderError = (userId) => {
      if (!procUserError.has(userId)) return null;
      return <Text variant="b2"><span style={{ color: 'var(--bg-danger)' }}>{procUserError.get(userId)}</span></Text>;
    };

    return users.map((user) => {
      const userId = user.user_id;
      const name = typeof user.display_name === 'string' ? user.display_name : userId;
      return (
        <RoomTile
          key={userId}
          avatarSrc={typeof user.avatar_url === 'string' ? mx.mxcUrlToHttp(user.avatar_url, 42, 42, 'crop') : null}
          name={name}
          id={userId}
          options={renderOptions(userId)}
          desc={renderError(userId)}
        />
      );
    });
  }

  useEffect(() => {
    if (isOpen && typeof searchTerm === 'string') searchUser(searchTerm);
    return () => {
      updateIsSearching(false);
      updateSearchQuery({});
      updateUsers([]);
      updateProcUsers(new Set());
      updateUserProcError(new Map());
      updateCreatedDM(new Map());
      updateRoomIdToUserId(new Map());
      updateInvitedUserIds(new Set());
    };
  }, [isOpen, searchTerm]);

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_CREATED, onDMCreated);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_CREATED, onDMCreated);
    };
  }, [isOpen, procUsers, createdDM, roomIdToUserId]);

  return (
    <PopupWindow
      isOpen={isOpen}
      title={(typeof roomId === 'string' ? t('Organisms.InviteUser.invite_to_room', { room: mx.getRoom(roomId).name }) : t('Organisms.InviteUser.invite_to_dm'))}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip={t('common.close')} />}
      onRequestClose={onRequestClose}
    >
      <div className="invite-user">
        <form className="invite-user__form" onSubmit={(e) => { e.preventDefault(); searchUser(usernameRef.current.value); }}>
          <Input value={searchTerm} forwardRef={usernameRef} label={t('Organisms.InviteUser.search_label')} />
          <Button disabled={isSearching} iconSrc={UserIC} variant="primary" type="submit">{t('common.search')}</Button>
        </form>
        <div className="invite-user__search-status">
          {
            typeof searchQuery.username !== 'undefined' && isSearching && (
              <div className="flex--center">
                <Spinner size="small" />
                <Text variant="b2">{t('Organisms.InviteUser.searching_for_user', { user_name: searchQuery.username })}</Text>
              </div>
            )
          }
          {
            typeof searchQuery.username !== 'undefined' && !isSearching && (
              <Text variant="b2">{t('Organisms.InviteUser.search_result_title', { user_name: searchQuery.username })}</Text>
            )
          }
          {
            searchQuery.error && <Text className="invite-user__search-error" variant="b2">{searchQuery.error}</Text>
          }
        </div>
        { users.length !== 0 && (
          <div className="invite-user__content">
            {renderUserList()}
          </div>
        )}
      </div>
    </PopupWindow>
  );
}

InviteUser.defaultProps = {
  roomId: undefined,
  searchTerm: undefined,
};

InviteUser.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  roomId: PropTypes.string,
  searchTerm: PropTypes.string,
  onRequestClose: PropTypes.func.isRequired,
};

export default InviteUser;
