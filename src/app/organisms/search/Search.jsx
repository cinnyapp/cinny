import React, { useState, useEffect, useRef } from 'react';
import './Search.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import AsyncSearch from '../../../util/AsyncSearch';
import { selectRoom, selectTab } from '../../../client/action/navigation';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import RawModal from '../../atoms/modal/RawModal';
import ScrollView from '../../atoms/scroll/ScrollView';
import RoomSelector from '../../molecules/room-selector/RoomSelector';

import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import HashIC from '../../../../public/res/ic/outlined/hash.svg';
import HashLockIC from '../../../../public/res/ic/outlined/hash-lock.svg';
import SpaceIC from '../../../../public/res/ic/outlined/space.svg';
import SpaceLockIC from '../../../../public/res/ic/outlined/space-lock.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

function useVisiblityToggle(setResult) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleSearchOpen = (term) => {
      setResult({
        term,
        chunk: [],
      });
      setIsOpen(true);
    };
    navigation.on(cons.events.navigation.SEARCH_OPENED, handleSearchOpen);
    return () => {
      navigation.removeListener(cons.events.navigation.SEARCH_OPENED, handleSearchOpen);
    };
  }, []);

  useEffect(() => {
    if (isOpen === false) {
      setResult(undefined);
    }
  }, [isOpen]);

  const requestClose = () => setIsOpen(false);

  return [isOpen, requestClose];
}

function mapRoomIds(roomIds, type) {
  const mx = initMatrix.matrixClient;
  const { directs, roomIdToParents } = initMatrix.roomList;

  return roomIds.map((roomId) => {
    let roomType = type;

    if (!roomType) {
      roomType = directs.has(roomId) ? 'direct' : 'room';
    }

    const room = mx.getRoom(roomId);
    const parentSet = roomIdToParents.get(roomId);
    const parentNames = parentSet
      ? [...parentSet].map((parentId) => mx.getRoom(parentId).name)
      : undefined;

    const parents = parentNames ? parentNames.join(', ') : null;

    return ({
      type: roomType,
      name: room.name,
      parents,
      roomId,
      room,
    });
  });
}

function Search() {
  const [result, setResult] = useState(null);
  const [asyncSearch] = useState(new AsyncSearch());
  const [isOpen, requestClose] = useVisiblityToggle(setResult);
  const searchRef = useRef(null);
  const mx = initMatrix.matrixClient;

  const handleSearchResults = (chunk, term) => {
    setResult({
      term,
      chunk,
    });
  };

  const generateResults = (term) => {
    const prefix = term.match(/^[#@*]/)?.[0];

    if (term.length === 1) {
      const { roomList } = initMatrix;
      const spaces = mapRoomIds([...roomList.spaces], 'space').reverse();
      const rooms = mapRoomIds([...roomList.rooms], 'room').reverse();
      const directs = mapRoomIds([...roomList.directs], 'direct').reverse();

      if (prefix === '*') {
        asyncSearch.setup(spaces, { keys: 'name', isContain: true, limit: 20 });
        handleSearchResults(spaces, '*');
      } else if (prefix === '#') {
        asyncSearch.setup(rooms, { keys: 'name', isContain: true, limit: 20 });
        handleSearchResults(rooms, '#');
      } else if (prefix === '@') {
        asyncSearch.setup(directs, { keys: 'name', isContain: true, limit: 20 });
        handleSearchResults(directs, '@');
      } else {
        const dataList = spaces.concat(rooms, directs);
        asyncSearch.setup(dataList, { keys: 'name', isContain: true, limit: 20 });
        asyncSearch.search(term);
      }
    } else {
      asyncSearch.search(prefix ? term.slice(1) : term);
    }
  };

  const loadRecentRooms = () => {
    const { recentRooms } = navigation;
    handleSearchResults(mapRoomIds(recentRooms).reverse(), '');
  };

  const handleAfterOpen = () => {
    searchRef.current.focus();
    loadRecentRooms();
    asyncSearch.on(asyncSearch.RESULT_SENT, handleSearchResults);

    if (typeof result.term === 'string') {
      generateResults(result.term);
      searchRef.current.value = result.term;
    }
  };

  const handleAfterClose = () => {
    asyncSearch.removeListener(asyncSearch.RESULT_SENT, handleSearchResults);
  };

  const handleOnChange = () => {
    const { value } = searchRef.current;
    if (value.length === 0) {
      loadRecentRooms();
      return;
    }
    generateResults(value);
  };

  const handleCross = (e) => {
    e.preventDefault();
    const { value } = searchRef.current;
    if (value.length === 0) requestClose();
    else {
      searchRef.current.value = '';
      searchRef.current.focus();
    }
  };

  const openItem = (roomId, type) => {
    if (type === 'space') selectTab(roomId);
    else selectRoom(roomId);
    requestClose();
  };

  const openFirstResult = () => {
    const { chunk } = result;
    if (chunk?.length > 0) {
      const item = chunk[0];
      openItem(item.roomId, item.type);
    }
  };

  const notifs = initMatrix.notifications;
  const renderRoomSelector = (item) => {
    const isPrivate = item.room.getJoinRule() === 'invite';
    let imageSrc = null;
    let iconSrc = null;
    if (item.type === 'room') iconSrc = isPrivate ? HashLockIC : HashIC;
    if (item.type === 'space') iconSrc = isPrivate ? SpaceLockIC : SpaceIC;
    if (item.type === 'direct') imageSrc = item.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;

    const isUnread = notifs.hasNoti(item.roomId);
    const noti = notifs.getNoti(item.roomId);

    return (
      <RoomSelector
        key={item.roomId}
        name={item.name}
        parentName={item.parents}
        roomId={item.roomId}
        imageSrc={imageSrc}
        iconSrc={iconSrc}
        isUnread={isUnread}
        notificationCount={noti.total}
        isAlert={noti.highlight > 0}
        onClick={() => openItem(item.roomId, item.type)}
      />
    );
  };

  return (
    <RawModal
      className="search-dialog__model dialog-model"
      isOpen={isOpen}
      onAfterOpen={handleAfterOpen}
      onAfterClose={handleAfterClose}
      onRequestClose={requestClose}
      size="small"
    >
      <div className="search-dialog">
        <form className="search-dialog__input" onSubmit={(e) => { e.preventDefault(); openFirstResult()}}>
          <RawIcon src={SearchIC} size="small" />
          <Input
            onChange={handleOnChange}
            forwardRef={searchRef}
            placeholder="Search"
          />
          <IconButton size="small" src={CrossIC} type="reset" onClick={handleCross} tabIndex={-1} />
        </form>
        <div className="search-dialog__content-wrapper">
          <ScrollView autoHide>
            <div className="search-dialog__content">
              { Array.isArray(result?.chunk) && result.chunk.map(renderRoomSelector) }
            </div>
          </ScrollView>
        </div>
        <div className="search-dialog__footer">
          <Text variant="b3">Type # for rooms, @ for DMs and * for spaces. Hotkey: Ctrl + k</Text>
        </div>
      </div>
    </RawModal>
  );
}

export default Search;
