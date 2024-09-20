import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './InviteUser.scss';

import * as roomActions from '../../../client/action/room';
import { hasDevices } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import UserIC from '../../../../public/res/ic/outlined/user.svg';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getDMRoomFor } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

function InviteUser({ isOpen, roomId, searchTerm, onRequestClose }) {
  const [isSearching, updateIsSearching] = useState(false);
  const [searchQuery, updateSearchQuery] = useState({});
  const [users, updateUsers] = useState([]);
  const useAuthentication = useMediaAuthentication();

  const [procUsers, updateProcUsers] = useState(new Set()); // proc stands for processing.
  const [procUserError, updateUserProcError] = useState(new Map());

  const [createdDM, updateCreatedDM] = useState(new Map());
  const [roomIdToUserId, updateRoomIdToUserId] = useState(new Map());

  const [invitedUserIds, updateInvitedUserIds] = useState(new Set());

  const usernameRef = useRef(null);

  const mx = useMatrixClient();
  const { navigateRoom } = useRoomNavigate();

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
        updateUsers([
          {
            user_id: inputUsername,
            display_name: result.displayname,
            avatar_url: result.avatar_url,
          },
        ]);
      } catch (e) {
        updateSearchQuery({ error: `${inputUsername} not found!` });
      }
    } else {
      try {
        const result = await mx.searchUserDirectory({
          term: inputUsername,
          limit: 20,
        });
        if (result.results.length === 0) {
          updateSearchQuery({ error: `No matches found for "${inputUsername}"!` });
          updateIsSearching(false);
          return;
        }
        updateUsers(result.results);
      } catch (e) {
        updateSearchQuery({ error: 'Something went wrong!' });
      }
    }
    updateIsSearching(false);
  }

  async function createDM(userId) {
    if (mx.getUserId() === userId) return;
    const dmRoomId = getDMRoomFor(mx, userId)?.roomId;
    if (dmRoomId) {
      navigateRoom(dmRoomId);
      onRequestClose();
      return;
    }

    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      const result = await roomActions.createDM(mx, userId, await hasDevices(mx, userId));
      roomIdToUserId.set(result.room_id, userId);
      updateRoomIdToUserId(getMapCopy(roomIdToUserId));
      onDMCreated(result.room_id);
    } catch (e) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, 'Something went wrong!');
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  async function inviteToRoom(userId) {
    if (typeof roomId === 'undefined') return;
    try {
      addUserToProc(userId);
      procUserError.delete(userId);
      updateUserProcError(getMapCopy(procUserError));

      await mx.invite(roomId, userId);

      invitedUserIds.add(userId);
      updateInvitedUserIds(new Set(Array.from(invitedUserIds)));
      deleteUserFromProc(userId);
    } catch (e) {
      deleteUserFromProc(userId);
      if (typeof e.message === 'string') procUserError.set(userId, e.message);
      else procUserError.set(userId, 'Something went wrong!');
      updateUserProcError(getMapCopy(procUserError));
    }
  }

  function renderUserList() {
    const renderOptions = (userId) => {
      const messageJSX = (message, isPositive) => (
        <Text variant="b2">
          <span style={{ color: isPositive ? 'var(--bg-positive)' : 'var(--bg-negative)' }}>
            {message}
          </span>
        </Text>
      );

      if (mx.getUserId() === userId) return null;
      if (procUsers.has(userId)) {
        return <Spinner size="small" />;
      }
      if (createdDM.has(userId)) {
        // eslint-disable-next-line max-len
        return (
          <Button
            onClick={() => {
              navigateRoom(createdDM.get(userId));
              onRequestClose();
            }}
          >
            Open
          </Button>
        );
      }
      if (invitedUserIds.has(userId)) {
        return messageJSX('Invited', true);
      }
      if (typeof roomId === 'string') {
        const member = mx.getRoom(roomId).getMember(userId);
        if (member !== null) {
          const userMembership = member.membership;
          switch (userMembership) {
            case 'join':
              return messageJSX('Already joined', true);
            case 'invite':
              return messageJSX('Already Invited', true);
            case 'ban':
              return messageJSX('Banned', false);
            default:
          }
        }
      }
      return typeof roomId === 'string' ? (
        <Button onClick={() => inviteToRoom(userId)} variant="primary">
          Invite
        </Button>
      ) : (
        <Button onClick={() => createDM(userId)} variant="primary">
          Message
        </Button>
      );
    };
    const renderError = (userId) => {
      if (!procUserError.has(userId)) return null;
      return (
        <Text variant="b2">
          <span style={{ color: 'var(--bg-danger)' }}>{procUserError.get(userId)}</span>
        </Text>
      );
    };

    return users.map((user) => {
      const userId = user.user_id;
      const name = typeof user.display_name === 'string' ? user.display_name : userId;
      return (
        <RoomTile
          key={userId}
          avatarSrc={
            typeof user.avatar_url === 'string'
              ? mx.mxcUrlToHttp(
                  user.avatar_url,
                  42,
                  42,
                  'crop',
                  undefined,
                  undefined,
                  useAuthentication
                )
              : null
          }
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

  return (
    <PopupWindow
      isOpen={isOpen}
      title={typeof roomId === 'string' ? `Invite to ${mx.getRoom(roomId).name}` : 'Direct message'}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip="Close" />}
      onRequestClose={onRequestClose}
    >
      <div className="invite-user">
        <form
          className="invite-user__form"
          onSubmit={(e) => {
            e.preventDefault();
            searchUser(usernameRef.current.value);
          }}
        >
          <Input value={searchTerm} forwardRef={usernameRef} label="Name or userId" />
          <Button disabled={isSearching} iconSrc={UserIC} variant="primary" type="submit">
            Search
          </Button>
        </form>
        <div className="invite-user__search-status">
          {typeof searchQuery.username !== 'undefined' && isSearching && (
            <div className="flex--center">
              <Spinner size="small" />
              <Text variant="b2">{`Searching for user "${searchQuery.username}"...`}</Text>
            </div>
          )}
          {typeof searchQuery.username !== 'undefined' && !isSearching && (
            <Text variant="b2">{`Search result for user "${searchQuery.username}"`}</Text>
          )}
          {searchQuery.error && (
            <Text className="invite-user__search-error" variant="b2">
              {searchQuery.error}
            </Text>
          )}
        </div>
        {users.length !== 0 && <div className="invite-user__content">{renderUserList()}</div>}
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
