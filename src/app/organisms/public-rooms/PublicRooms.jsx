import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './PublicRooms.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { selectRoom, selectTab } from '../../../client/action/navigation';
import * as roomActions from '../../../client/action/room';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Spinner from '../../atoms/spinner/Spinner';
import Input from '../../atoms/input/Input';
import PopupWindow from '../../molecules/popup-window/PopupWindow';
import RoomTile from '../../molecules/room-tile/RoomTile';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';


const SEARCH_LIMIT = 20;

function TryJoinWithAlias({ alias, onRequestClose }) {
  const { t } = useTranslation();

  const [status, setStatus] = useState({
    isJoining: false,
    error: null,
    roomId: null,
    tempRoomId: null,
  });
  function handleOnRoomAdded(roomId) {
    if (status.tempRoomId !== null && status.tempRoomId !== roomId) return;
    setStatus({
      isJoining: false, error: null, roomId, tempRoomId: null,
    });
  }

  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [status]);

  async function joinWithAlias() {
    setStatus({
      isJoining: true, error: null, roomId: null, tempRoomId: null,
    });
    try {
      const roomId = await roomActions.join(alias, false);
      setStatus({
        isJoining: true, error: null, roomId: null, tempRoomId: roomId,
      });
    } catch (e) {
      setStatus({
        isJoining: false,
        error: t("PublicRooms.could_not_join_alias", {alias: alias}),
        roomId: null,
        tempRoomId: null,
      });
    }
  }

  return (
    <div className="try-join-with-alias">
      {status.roomId === null && !status.isJoining && status.error === null && (
        <Button onClick={() => joinWithAlias()}>{t("PublicRooms.try_joining_alias", {alias: alias})}</Button>
      )}
      {status.isJoining && (
        <>
          <Spinner size="small" />
          <Text>{t("PublicRooms.joining_alias", {alias: alias})}</Text>
        </>
      )}
      {status.roomId !== null && (
        <Button onClick={() => { onRequestClose(); selectRoom(status.roomId); }}>{t("common.open")}</Button>
      )}
      {status.error !== null && <Text variant="b2"><span style={{ color: 'var(--bg-danger)' }}>{status.error}</span></Text>}
    </div>
  );
}

TryJoinWithAlias.propTypes = {
  alias: PropTypes.string.isRequired,
  onRequestClose: PropTypes.func.isRequired,
};

function PublicRooms({ isOpen, searchTerm, onRequestClose }) {
  const [isSearching, updateIsSearching] = useState(false);
  const [isViewMore, updateIsViewMore] = useState(false);
  const [publicRooms, updatePublicRooms] = useState([]);
  const [nextBatch, updateNextBatch] = useState(undefined);
  const [searchQuery, updateSearchQuery] = useState({});
  const [joiningRooms, updateJoiningRooms] = useState(new Set());

  const { t } = useTranslation();
  const roomNameRef = useRef(null);
  const hsRef = useRef(null);
  const userId = initMatrix.matrixClient.getUserId();

  async function searchRooms(viewMore) {
    let inputRoomName = roomNameRef?.current?.value || searchTerm;
    let isInputAlias = false;
    if (typeof inputRoomName === 'string') {
      isInputAlias = inputRoomName[0] === '#' && inputRoomName.indexOf(':') > 1;
    }
    const hsFromAlias = (isInputAlias) ? inputRoomName.slice(inputRoomName.indexOf(':') + 1) : null;
    let inputHs = hsFromAlias || hsRef?.current?.value;

    if (typeof inputHs !== 'string') inputHs = userId.slice(userId.indexOf(':') + 1);
    if (typeof inputRoomName !== 'string') inputRoomName = '';

    if (isSearching) return;
    if (viewMore !== true
      && inputRoomName === searchQuery.name
      && inputHs === searchQuery.homeserver
    ) return;

    updateSearchQuery({
      name: inputRoomName,
      homeserver: inputHs,
    });
    if (isViewMore !== viewMore) updateIsViewMore(viewMore);
    updateIsSearching(true);

    try {
      const result = await initMatrix.matrixClient.publicRooms({
        server: inputHs,
        limit: SEARCH_LIMIT,
        since: viewMore ? nextBatch : undefined,
        include_all_networks: true,
        filter: {
          generic_search_term: inputRoomName,
        },
      });

      const totalRooms = viewMore ? publicRooms.concat(result.chunk) : result.chunk;
      updatePublicRooms(totalRooms);
      updateNextBatch(result.next_batch);
      updateIsSearching(false);
      updateIsViewMore(false);
      if (totalRooms.length === 0) {
        updateSearchQuery({
          error: inputRoomName === ''
            ? t("PublicRooms.no_public_rooms", {homeserver: inputHs})
            : t("PublicRooms.no_result_found", {homeserver: inputHs, input: inputRoomName}),
          alias: isInputAlias ? inputRoomName : null,
        });
      }
    } catch (e) {
      updatePublicRooms([]);
      let err = t("errors.generic");
      if (e?.httpStatus >= 400 && e?.httpStatus < 500) {
        err = e.message;
      }
      updateSearchQuery({
        error: err,
        alias: isInputAlias ? inputRoomName : null,
      });
      updateIsSearching(false);
      updateNextBatch(undefined);
      updateIsViewMore(false);
    }
  }

  useEffect(() => {
    if (isOpen) searchRooms();
  }, [isOpen]);

  function handleOnRoomAdded(roomId) {
    if (joiningRooms.has(roomId)) {
      joiningRooms.delete(roomId);
      updateJoiningRooms(new Set(Array.from(joiningRooms)));
    }
  }
  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleOnRoomAdded);
    };
  }, [joiningRooms]);

  function handleViewRoom(roomId) {
    const room = initMatrix.matrixClient.getRoom(roomId);
    if (room.isSpaceRoom()) selectTab(roomId);
    else selectRoom(roomId);
    onRequestClose();
  }

  function joinRoom(roomIdOrAlias) {
    joiningRooms.add(roomIdOrAlias);
    updateJoiningRooms(new Set(Array.from(joiningRooms)));
    roomActions.join(roomIdOrAlias, false);
  }

  function renderRoomList(rooms) {
    return rooms.map((room) => {
      const alias = typeof room.canonical_alias === 'string' ? room.canonical_alias : room.room_id;
      const name = typeof room.name === 'string' ? room.name : alias;
      const isJoined = initMatrix.matrixClient.getRoom(room.room_id)?.getMyMembership() === 'join';
      return (
        <RoomTile
          key={room.room_id}
          avatarSrc={typeof room.avatar_url === 'string' ? initMatrix.matrixClient.mxcUrlToHttp(room.avatar_url, 42, 42, 'crop') : null}
          name={name}
          id={alias}
          memberCount={room.num_joined_members}
          desc={typeof room.topic === 'string' ? room.topic : null}
          options={(
            <>
              {isJoined && <Button onClick={() => handleViewRoom(room.room_id)}>{t("common.open")}</Button>}
              {!isJoined && (joiningRooms.has(room.room_id) ? <Spinner size="small" /> : <Button onClick={() => joinRoom(room.aliases?.[0] || room.room_id)} variant="primary">{t("commom.join")}</Button>)}
            </>
          )}
        />
      );
    });
  }

  return (
    <PopupWindow
      isOpen={isOpen}
      title={t("PublicRooms.title")}
      contentOptions={<IconButton src={CrossIC} onClick={onRequestClose} tooltip={t("common.close")} />}
      onRequestClose={onRequestClose}
    >
      <div className="public-rooms">
        <form className="public-rooms__form" onSubmit={(e) => { e.preventDefault(); searchRooms(); }}>
          <div className="public-rooms__input-wrapper">
            <Input value={searchTerm} forwardRef={roomNameRef} label={t("PublicRooms.search_room_name_alias")} />
            <Input forwardRef={hsRef} value={userId.slice(userId.indexOf(':') + 1)} label={t("common.homeserver")} required />
          </div>
          <Button disabled={isSearching} iconSrc={HashSearchIC} variant="primary" type="submit">{t("PublicRooms.search_button")}</Button>
        </form>
        <div className="public-rooms__search-status">
          {
            typeof searchQuery.name !== 'undefined' && isSearching && (
              searchQuery.name === ''
                ? (
                  <div className="flex--center">
                    <Spinner size="small" />
                    <Text variant="b2">{t("PublicRooms.loading", {homeserver: searchQuery.homeserver})}</Text>
                  </div>
                )
                : (
                  <div className="flex--center">
                    <Spinner size="small" />
                    <Text variant="b2">{t("PublicRooms.searching", {homeserver: searchQuery.homeserver, query: searchQuery.name})}</Text>
                  </div>
                )
            )
          }
          {
            typeof searchQuery.name !== 'undefined' && !isSearching && (
              searchQuery.name === ''
                ? <Text variant="b2">{t("PublicRooms.result_title", {homeserver: searchQuery.homeserver})}</Text>
                : <Text variant="b2">{t("PublicRooms.search_result_title", {homeserver: searchQuery.homeserver, query: searchQuery.name})}</Text>
            )
          }
          { searchQuery.error && (
            <>
              <Text className="public-rooms__search-error" variant="b2">{searchQuery.error}</Text>
              {typeof searchQuery.alias === 'string' && (
                <TryJoinWithAlias onRequestClose={onRequestClose} alias={searchQuery.alias} />
              )}
            </>
          )}
        </div>
        { publicRooms.length !== 0 && (
          <div className="public-rooms__content">
            { renderRoomList(publicRooms) }
          </div>
        )}
        { publicRooms.length !== 0 && publicRooms.length % SEARCH_LIMIT === 0 && (
          <div className="public-rooms__view-more">
            { isViewMore !== true && (
              <Button onClick={() => searchRooms(true)}>{t("commom.view_more")}</Button>
            )}
            { isViewMore && <Spinner /> }
          </div>
        )}
      </div>
    </PopupWindow>
  );
}

PublicRooms.defaultProps = {
  searchTerm: undefined,
};

PublicRooms.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  searchTerm: PropTypes.string,
  onRequestClose: PropTypes.func.isRequired,
};

export default PublicRooms;
