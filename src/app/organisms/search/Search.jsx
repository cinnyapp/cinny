import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAtomValue } from 'jotai';
import './Search.scss';

import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import AsyncSearch from '../../../util/AsyncSearch';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import RawModal from '../../atoms/modal/RawModal';
import ScrollView from '../../atoms/scroll/ScrollView';
import RoomSelector from '../../molecules/room-selector/RoomSelector';

import SearchIC from '../../../../public/res/ic/outlined/search.svg';
import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useDirects, useRooms, useSpaces } from '../../state/hooks/roomList';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { allRoomsAtom } from '../../state/room-list/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { useKeyDown } from '../../hooks/useKeyDown';
import { openSearch } from '../../../client/action/navigation';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { factoryRoomIdByActivity } from '../../utils/sort';

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

  useKeyDown(
    window,
    useCallback((event) => {
      // Ctrl/Cmd +
      if (event.ctrlKey || event.metaKey) {
        // open search modal
        if (event.key === 'k') {
          event.preventDefault();
          // means some menu or modal window is open
          if (
            document.body.lastChild.className !== 'ReactModalPortal' ||
            navigation.isRawModalVisible
          ) {
            return;
          }
          openSearch();
        }
      }
    }, [])
  );

  const requestClose = () => setIsOpen(false);

  return [isOpen, requestClose];
}

function mapRoomIds(mx, roomIds, directs, roomIdToParents) {
  return roomIds.map((roomId) => {
    const room = mx.getRoom(roomId);
    const parentSet = roomIdToParents.get(roomId);
    const parentNames = parentSet ? [] : undefined;
    parentSet?.forEach((parentId) => parentNames.push(mx.getRoom(parentId).name));

    const parents = parentNames ? parentNames.join(', ') : null;

    let type = 'room';
    if (room.isSpaceRoom()) type = 'space';
    else if (directs.includes(roomId)) type = 'direct';

    return {
      type,
      name: room.name,
      parents,
      roomId,
      room,
    };
  });
}

function Search() {
  const [result, setResult] = useState(null);
  const [asyncSearch] = useState(new AsyncSearch());
  const [isOpen, requestClose] = useVisiblityToggle(setResult);
  const searchRef = useRef(null);
  const mx = useMatrixClient();
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const mDirects = useAtomValue(mDirectAtom);
  const spaces = useSpaces(mx, allRoomsAtom);
  const rooms = useRooms(mx, allRoomsAtom, mDirects);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);

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

    let ids = null;

    if (prefix) {
      if (prefix === '#') ids = [...rooms];
      else if (prefix === '@') ids = [...directs];
      else ids = [...spaces];
    } else {
      ids = [...rooms].concat([...directs], [...spaces]);
    }

    ids.sort(factoryRoomIdByActivity(mx));
    const mappedIds = mapRoomIds(mx, ids, directs, roomToParents);
    asyncSearch.setup(mappedIds, { keys: 'name', isContain: true, limit: 20 });
    if (prefix) handleSearchResults(mappedIds, prefix);
    else asyncSearch.search(term);
  };

  const loadRecentRooms = () => {
    const recentRooms = [];
    handleSearchResults(mapRoomIds(mx, recentRooms, directs, roomToParents).reverse());
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
    if (type === 'space') navigateSpace(roomId);
    else navigateRoom(roomId);
    requestClose();
  };

  const openFirstResult = () => {
    const { chunk } = result;
    if (chunk?.length > 0) {
      const item = chunk[0];
      openItem(item.roomId, item.type);
    }
  };

  const renderRoomSelector = (item) => {
    let imageSrc = null;
    let iconSrc = null;
    if (item.type === 'direct') {
      imageSrc =
        item.room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
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
        isUnread={roomToUnread.has(item.roomId)}
        notificationCount={roomToUnread.get(item.roomId)?.total ?? 0}
        isAlert={roomToUnread.get(item.roomId)?.highlight > 0}
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
        <form
          className="search-dialog__input"
          onSubmit={(e) => {
            e.preventDefault();
            openFirstResult();
          }}
        >
          <RawIcon src={SearchIC} size="small" />
          <Input onChange={handleOnChange} forwardRef={searchRef} placeholder="Search" />
          <IconButton size="small" src={CrossIC} type="reset" onClick={handleCross} tabIndex={-1} />
        </form>
        <div className="search-dialog__content-wrapper">
          <ScrollView autoHide>
            <div className="search-dialog__content">
              {Array.isArray(result?.chunk) && result.chunk.map(renderRoomSelector)}
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
