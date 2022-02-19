/* eslint-disable react/prop-types */
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './SpaceManage.scss';

import { twemojify } from '../../../util/twemojify';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import colorMXID from '../../../util/colorMXID';
import { selectRoom, selectTab } from '../../../client/action/navigation';
import RoomsHierarchy from '../../../client/state/RoomsHierarchy';
import { joinRuleToIconSrc } from '../../../util/matrixUtil';
import { join } from '../../../client/action/room';
import { Debounce } from '../../../util/common';

import Text from '../../atoms/text/Text';
import RawIcon from '../../atoms/system-icons/RawIcon';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Checkbox from '../../atoms/button/Checkbox';
import Avatar from '../../atoms/avatar/Avatar';
import Spinner from '../../atoms/spinner/Spinner';
import ScrollView from '../../atoms/scroll/ScrollView';
import PopupWindow from '../../molecules/popup-window/PopupWindow';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import ChevronRightIC from '../../../../public/res/ic/outlined/chevron-right.svg';
import InfoIC from '../../../../public/res/ic/outlined/info.svg';

import { useForceUpdate } from '../../hooks/useForceUpdate';
import { useStore } from '../../hooks/useStore';

function SpaceManageBreadcrumb({ path, onSelect }) {
  return (
    <div className="space-manage-breadcrumb__wrapper">
      <ScrollView horizontal vertical={false} invisible>
        <div className="space-manage-breadcrumb">
          {
            path.map((item, index) => (
              <React.Fragment key={item.roomId}>
                {index > 0 && <RawIcon size="extra-small" src={ChevronRightIC} />}
                <Button onClick={() => onSelect(item.roomId, item.name)}>
                  <Text variant="b2">{twemojify(item.name)}</Text>
                </Button>
              </React.Fragment>
            ))
          }
        </div>
      </ScrollView>
    </div>
  );
}
SpaceManageBreadcrumb.propTypes = {
  path: PropTypes.arrayOf(PropTypes.exact({
    roomId: PropTypes.string,
    name: PropTypes.string,
  })).isRequired,
  onSelect: PropTypes.func.isRequired,
};

function SpaceManageItem({
  parentId, roomInfo, onSpaceClick, requestClose,
  isSelected, onSelect, roomHierarchy,
}) {
  const [isExpand, setIsExpand] = useState(false);
  const [isJoining, setIsJoining] = useState(false);

  const { directs } = initMatrix.roomList;
  const mx = initMatrix.matrixClient;
  const parentRoom = mx.getRoom(parentId);
  const isSpace = roomInfo.room_type === 'm.space';
  const roomId = roomInfo.room_id;
  const canManage = parentRoom?.currentState.maySendStateEvent('m.space.child', mx.getUserId()) || false;
  const isSuggested = parentRoom?.currentState.getStateEvents('m.space.child', roomId)?.getContent().suggested === true;

  const room = mx.getRoom(roomId);
  const isJoined = !!(room?.getMyMembership() === 'join' || null);
  const name = room?.name || roomInfo.name || roomInfo.canonical_alias || roomId;
  let imageSrc = mx.mxcUrlToHttp(roomInfo.avatar_url, 24, 24, 'crop') || null;
  if (!imageSrc && room) {
    imageSrc = room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
    if (imageSrc === null) imageSrc = room.getAvatarUrl(mx.baseUrl, 24, 24, 'crop') || null;
  }
  const isDM = directs.has(roomId);

  const handleOpen = () => {
    if (isSpace) selectTab(roomId);
    else selectRoom(roomId);
    requestClose();
  };
  const handleJoin = () => {
    const viaSet = roomHierarchy.viaMap.get(roomId);
    const via = viaSet ? [...viaSet] : undefined;
    join(roomId, false, via);
    setIsJoining(true);
  };

  const roomAvatarJSX = (
    <Avatar
      text={name}
      bgColor={colorMXID(roomId)}
      imageSrc={isDM ? imageSrc : null}
      iconColor="var(--ic-surface-low)"
      iconSrc={
        isDM
          ? null
          : joinRuleToIconSrc((roomInfo.join_rules || roomInfo.join_rule), isSpace)
      }
      size="extra-small"
    />
  );
  const roomNameJSX = (
    <Text>
      {twemojify(name)}
      <Text variant="b3" span>{` • ${roomInfo.num_joined_members} members`}</Text>
    </Text>
  );

  const expandBtnJsx = (
    <IconButton
      variant={isExpand ? 'primary' : 'surface'}
      size="extra-small"
      src={InfoIC}
      tooltip="Topic"
      tooltipPlacement="top"
      onClick={() => setIsExpand(!isExpand)}
    />
  );

  return (
    <div
      className={`space-manage-item${isSpace ? '--space' : ''}`}
    >
      <div>
        {canManage && <Checkbox isActive={isSelected} onToggle={() => onSelect(roomId)} variant="positive" />}
        <button
          className="space-manage-item__btn"
          onClick={isSpace ? () => onSpaceClick(roomId, name) : null}
          type="button"
        >
          {roomAvatarJSX}
          {roomNameJSX}
          {isSuggested && <Text variant="b2">Suggested</Text>}
        </button>
        {roomInfo.topic && expandBtnJsx}
        {
          isJoined
            ? <Button onClick={handleOpen}>Open</Button>
            : <Button variant="primary" onClick={handleJoin} disabled={isJoining}>{isJoining ? 'Joining...' : 'Join'}</Button>
        }
      </div>
      {isExpand && roomInfo.topic && <Text variant="b2">{twemojify(roomInfo.topic, undefined, true)}</Text>}
    </div>
  );
}
SpaceManageItem.propTypes = {
  parentId: PropTypes.string.isRequired,
  roomHierarchy: PropTypes.shape({}).isRequired,
  roomInfo: PropTypes.shape({}).isRequired,
  onSpaceClick: PropTypes.func.isRequired,
  requestClose: PropTypes.func.isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
};

function SpaceManageFooter({ parentId, selected }) {
  const [process, setProcess] = useState(null);
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(parentId);
  const { currentState } = room;

  const allSuggested = selected.every((roomId) => {
    const sEvent = currentState.getStateEvents('m.space.child', roomId);
    return !!sEvent?.getContent()?.suggested;
  });

  const handleRemove = () => {
    setProcess(`Removing ${selected.length} items`);
    selected.forEach((roomId) => {
      mx.sendStateEvent(parentId, 'm.space.child', {}, roomId);
    });
  };

  const handleToggleSuggested = (isMark) => {
    if (isMark) setProcess(`Marking as suggested ${selected.length} items`);
    else setProcess(`Marking as not suggested ${selected.length} items`);
    selected.forEach((roomId) => {
      const sEvent = room.currentState.getStateEvents('m.space.child', roomId);
      if (!sEvent) return;
      const content = { ...sEvent.getContent() };
      if (isMark && content.suggested) return;
      if (!isMark && !content.suggested) return;
      content.suggested = isMark;
      mx.sendStateEvent(parentId, 'm.space.child', content, roomId);
    });
  };

  return (
    <div className="space-manage__footer">
      {process && <Spinner size="small" />}
      <Text weight="medium">{process || `${selected.length} item selected`}</Text>
      { !process && (
        <>
          <Button onClick={handleRemove} variant="danger">Remove</Button>
          <Button
            onClick={() => handleToggleSuggested(!allSuggested)}
            variant={allSuggested ? 'surface' : 'primary'}
          >
            {allSuggested ? 'Mark as not suggested' : 'Mark as suggested'}
          </Button>
        </>
      )}
    </div>
  );
}
SpaceManageFooter.propTypes = {
  parentId: PropTypes.string.isRequired,
  selected: PropTypes.arrayOf(PropTypes.string).isRequired,
};

function useSpacePath(roomId) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const [spacePath, setSpacePath] = useState([{ roomId, name: room.name }]);

  const addPathItem = (rId, name) => {
    const newPath = [...spacePath];
    const itemIndex = newPath.findIndex((item) => item.roomId === rId);
    if (itemIndex < 0) {
      newPath.push({ roomId: rId, name });
      setSpacePath(newPath);
      return;
    }
    newPath.splice(itemIndex + 1);
    setSpacePath(newPath);
  };

  return [spacePath, addPathItem];
}

function useUpdateOnJoin(roomId) {
  const [, forceUpdate] = useForceUpdate();
  const { roomList } = initMatrix;

  useEffect(() => {
    const handleRoomList = () => forceUpdate();

    roomList.on(cons.events.roomList.ROOM_JOINED, handleRoomList);
    roomList.on(cons.events.roomList.ROOM_LEAVED, handleRoomList);
    return () => {
      roomList.removeListener(cons.events.roomList.ROOM_JOINED, handleRoomList);
      roomList.removeListener(cons.events.roomList.ROOM_LEAVED, handleRoomList);
    };
  }, [roomId]);
}

function useChildUpdate(roomId, roomsHierarchy) {
  const [, forceUpdate] = useForceUpdate();
  const [debounce] = useState(new Debounce());
  const mx = initMatrix.matrixClient;

  useEffect(() => {
    let isMounted = true;
    const handleStateEvent = (event) => {
      if (event.getRoomId() !== roomId) return;
      if (event.getType() !== 'm.space.child') return;

      debounce._(() => {
        if (!isMounted) return;
        roomsHierarchy.removeHierarchy(roomId);
        forceUpdate();
      }, 500)();
    };
    mx.on('RoomState.events', handleStateEvent);
    return () => {
      isMounted = false;
      mx.removeListener('RoomState.events', handleStateEvent);
    };
  }, [roomId, roomsHierarchy]);
}

function SpaceManageContent({ roomId, requestClose }) {
  const mx = initMatrix.matrixClient;
  useUpdateOnJoin(roomId);
  const [, forceUpdate] = useForceUpdate();
  const [roomsHierarchy] = useState(new RoomsHierarchy(mx, 30));
  const [spacePath, addPathItem] = useSpacePath(roomId);
  const [isLoading, setIsLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const mountStore = useStore();
  const currentPath = spacePath[spacePath.length - 1];
  useChildUpdate(currentPath.roomId, roomsHierarchy);

  const currentHierarchy = roomsHierarchy.getHierarchy(currentPath.roomId);

  useEffect(() => {
    mountStore.setItem(true);
    return () => {
      mountStore.setItem(false);
    };
  }, [roomId]);

  useEffect(() => setSelected([]), [spacePath]);

  const handleSelected = (selectedRoomId) => {
    const newSelected = [...selected];
    const selectedIndex = newSelected.indexOf(selectedRoomId);

    if (selectedIndex > -1) {
      newSelected.splice(selectedIndex, 1);
      setSelected(newSelected);
      return;
    }
    newSelected.push(selectedRoomId);
    setSelected(newSelected);
  };

  const loadRoomHierarchy = async () => {
    if (!roomsHierarchy.canLoadMore(currentPath.roomId)) return;
    if (!roomsHierarchy.getHierarchy(currentPath.roomId)) setSelected([]);
    setIsLoading(true);
    try {
      await roomsHierarchy.load(currentPath.roomId);
      if (!mountStore.getItem()) return;
      setIsLoading(false);
      forceUpdate();
    } catch {
      if (!mountStore.getItem()) return;
      setIsLoading(false);
      forceUpdate();
    }
  };

  if (!currentHierarchy) loadRoomHierarchy();
  return (
    <div className="space-manage__content">
      {spacePath.length > 1 && (
        <SpaceManageBreadcrumb path={spacePath} onSelect={addPathItem} />
      )}
      <Text variant="b3" weight="bold">Rooms and spaces</Text>
      <div className="space-manage__content-items">
        {!isLoading && currentHierarchy?.rooms?.length === 1 && (
          <Text>
            Either the space contains private rooms or you need to join space to view it's rooms.
          </Text>
        )}
        {currentHierarchy && (currentHierarchy.rooms?.map((roomInfo) => (
          roomInfo.room_id === currentPath.roomId
            ? null
            : (
              <SpaceManageItem
                key={roomInfo.room_id}
                isSelected={selected.includes(roomInfo.room_id)}
                roomHierarchy={currentHierarchy}
                parentId={currentPath.roomId}
                roomInfo={roomInfo}
                onSpaceClick={addPathItem}
                requestClose={requestClose}
                onSelect={handleSelected}
              />
            )
        )))}
        {!currentHierarchy && <Text>loading...</Text>}
      </div>
      {currentHierarchy?.canLoadMore && !isLoading && (
        <Button onClick={loadRoomHierarchy}>Load more</Button>
      )}
      {isLoading && (
        <div className="space-manage__content-loading">
          <Spinner size="small" />
          <Text>Loading rooms...</Text>
        </div>
      )}
      {selected.length > 0 && (
        <SpaceManageFooter parentId={currentPath.roomId} selected={selected} />
      )}
    </div>
  );
}
SpaceManageContent.propTypes = {
  roomId: PropTypes.string.isRequired,
  requestClose: PropTypes.func.isRequired,
};

function useWindowToggle() {
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const openSpaceManage = (rId) => {
      setRoomId(rId);
    };
    navigation.on(cons.events.navigation.SPACE_MANAGE_OPENED, openSpaceManage);
    return () => {
      navigation.removeListener(cons.events.navigation.SPACE_MANAGE_OPENED, openSpaceManage);
    };
  }, []);

  const requestClose = () => setRoomId(null);

  return [roomId, requestClose];
}
function SpaceManage() {
  const mx = initMatrix.matrixClient;
  const [roomId, requestClose] = useWindowToggle();
  const room = mx.getRoom(roomId);

  return (
    <PopupWindow
      isOpen={roomId !== null}
      className="space-manage"
      title={(
        <Text variant="s1" weight="medium" primary>
          {roomId && twemojify(room.name)}
          <span style={{ color: 'var(--tc-surface-low)' }}> — manage rooms</span>
        </Text>
      )}
      contentOptions={<IconButton src={CrossIC} onClick={requestClose} tooltip="Close" />}
      onRequestClose={requestClose}
    >
      {
        roomId
          ? <SpaceManageContent roomId={roomId} requestClose={requestClose} />
          : <div />
      }
    </PopupWindow>
  );
}

export default SpaceManage;
