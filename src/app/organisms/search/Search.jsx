import React, { useState, useEffect, useRef } from 'react';
import './Search.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import AsyncSearch from '../../../util/AsyncSearch';
import { selectRoom, selectTab } from '../../../client/action/navigation';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';
import { roomIdByActivity } from '../../../util/sort';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import RawModal from '../../atoms/modal/RawModal';
import ScrollView from '../../atoms/scroll/ScrollView';
import RoomSelector from '../../molecules/room-selector/RoomSelector';

import SearchIC from '../../../../public/res/ic/outlined/search.svg';
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

function mapRoomIds(roomIds) {
  const mx = initMatrix.matrixClient;
  const { directs, roomIdToParents } = initMatrix.roomList;

  return roomIds.map((roomId) => {
    const room = mx.getRoom(roomId);
    const parentSet = roomIdToParents.get(roomId);
    const parentNames = parentSet ? [] : undefined;
    parentSet?.forEach((parentId) => parentNames.push(mx.getRoom(parentId).name));

    const parents = parentNames ? parentNames.join(', ') : null;

    let type = 'room';
    if (room.isSpaceRoom()) type = 'space';
    else if (directs.has(roomId)) type = 'direct';

    return ({
      type,
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

    if (term.length > 1) {
      asyncSearch.search(prefix ? term.slice(1) : term);
      return;
    }

    const { spaces, rooms, directs } = initMatrix.roomList;
    let ids = null;

    if (prefix) {
      if (prefix === '#') ids = [...rooms];
      else if (prefix === '@') ids = [...directs];
      else ids = [...spaces];
    } else {
      ids = [...rooms].concat([...directs], [...spaces]);
    }

    ids.sort(roomIdByActivity);
    const mappedIds = mapRoomIds(ids);
    asyncSearch.setup(mappedIds, { keys: 'name', isContain: true, limit: 20 });
    if (prefix) handleSearchResults(mappedIds, prefix);
    else asyncSearch.search(term);
  };

  const loadRecentRooms = () => {
    const { recentRooms } = navigation;
    handleSearchResults(mapRoomIds(recentRooms).reverse());
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
      loadRecentRooms();
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

  const noti = initMatrix.notifications;
  const renderRoomSelector = (item) => {
    let imageSrc = null;
    let iconSrc = null;
    if (item.type === 'direct') {
      imageSrc = item.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
    } else {
      iconSrc = joinRuleToIconSrc(item.room.getJoinRule(), item.type === 'space');
    }

    return (
      <RoomSelector
        key={item.roomId}
        name={item.name}
        parentName={item.parents}
        roomId={item.roomId}
        imageSrc={imageSrc}
        iconSrc={iconSrc}
        isUnread={noti.hasNoti(item.roomId)}
        notificationCount={noti.getTotalNoti(item.roomId)}
        isAlert={noti.getHighlightNoti(item.roomId) > 0}
        onClick={() => openItem(item.roomId, item.type)}
      />
    );
  };

  return (
    <RawModal
      className="search-dialog__modal dialog-modal"
      isOpen={isOpen}
      onAfterOpen={handleAfterOpen}
      onAfterClose={handleAfterClose}
      onRequestClose={requestClose}
      size="small"
    >
      <div className="search-dialog">
        <form className="search-dialog__input" onSubmit={(e) => { e.preventDefault(); openFirstResult(); }}>
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
