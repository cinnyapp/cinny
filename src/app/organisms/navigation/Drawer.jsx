import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './Drawer.scss';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import { doesRoomHaveUnread } from '../../../util/matrixUtil';
import {
  selectRoom, openPublicChannels, openCreateChannel, openInviteUser,
} from '../../../client/action/navigation';
import navigation from '../../../client/state/navigation';

import Header, { TitleWrapper } from '../../atoms/header/Header';
import Text from '../../atoms/text/Text';
import IconButton from '../../atoms/button/IconButton';
import ScrollView from '../../atoms/scroll/ScrollView';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';
import ChannelSelector from '../../molecules/channel-selector/ChannelSelector';

import PlusIC from '../../../../public/res/ic/outlined/plus.svg';
// import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import HashIC from '../../../../public/res/ic/outlined/hash.svg';
import HashLockIC from '../../../../public/res/ic/outlined/hash-lock.svg';
import HashPlusIC from '../../../../public/res/ic/outlined/hash-plus.svg';
import HashSearchIC from '../../../../public/res/ic/outlined/hash-search.svg';
import SpaceIC from '../../../../public/res/ic/outlined/space.svg';
import SpaceLockIC from '../../../../public/res/ic/outlined/space-lock.svg';

function AtoZ(aId, bId) {
  let aName = initMatrix.matrixClient.getRoom(aId).name;
  let bName = initMatrix.matrixClient.getRoom(bId).name;

  // remove "#" from the room name
  // To ignore it in sorting
  aName = aName.replaceAll('#', '');
  bName = bName.replaceAll('#', '');

  if (aName.toLowerCase() < bName.toLowerCase()) {
    return -1;
  }
  if (aName.toLowerCase() > bName.toLowerCase()) {
    return 1;
  }
  return 0;
}

function DrawerHeader({ tabId }) {
  return (
    <Header>
      <TitleWrapper>
        <Text variant="s1">{(tabId === 'channels' ? 'Home' : 'Direct messages')}</Text>
      </TitleWrapper>
      {(tabId === 'dm')
        ? <IconButton onClick={() => openInviteUser()} tooltip="Start DM" src={PlusIC} size="normal" />
        : (
          <ContextMenu
            content={(hideMenu) => (
              <>
                <MenuHeader>Add channel</MenuHeader>
                <MenuItem
                  iconSrc={HashPlusIC}
                  onClick={() => { hideMenu(); openCreateChannel(); }}
                >
                  Create new channel
                </MenuItem>
                <MenuItem
                  iconSrc={HashSearchIC}
                  onClick={() => { hideMenu(); openPublicChannels(); }}
                >
                  Add Public channel
                </MenuItem>
              </>
            )}
            render={(toggleMenu) => (<IconButton onClick={toggleMenu} tooltip="Add channel" src={PlusIC} size="normal" />)}
          />
        )}
      {/* <IconButton onClick={() => ''} tooltip="Menu" src={VerticalMenuIC} size="normal" /> */}
    </Header>
  );
}
DrawerHeader.propTypes = {
  tabId: PropTypes.string.isRequired,
};

function DrawerBradcrumb() {
  return (
    <div className="breadcrumb__wrapper">
      <ScrollView horizontal vertical={false}>
        <div>
          {/* TODO: bradcrumb space paths when spaces become a thing */}
        </div>
      </ScrollView>
    </div>
  );
}

function renderSelector(room, roomId, isSelected, isDM) {
  const mx = initMatrix.matrixClient;
  let imageSrc = room.getAvatarFallbackMember()?.getAvatarUrl(mx.baseUrl, 24, 24, 'crop');
  if (typeof imageSrc === 'undefined') imageSrc = null;

  return (
    <ChannelSelector
      key={roomId}
      iconSrc={
        isDM
          ? null
          : (() => {
            if (room.isSpaceRoom()) {
              return (room.getJoinRule() === 'invite' ? SpaceLockIC : SpaceIC);
            }
            return (room.getJoinRule() === 'invite' ? HashLockIC : HashIC);
          })()
      }
      imageSrc={isDM ? imageSrc : null}
      roomId={roomId}
      unread={doesRoomHaveUnread(room)}
      onClick={() => selectRoom(roomId)}
      notificationCount={room.getUnreadNotificationCount('total')}
      alert={room.getUnreadNotificationCount('highlight') !== 0}
      selected={isSelected}
    >
      {room.name}
    </ChannelSelector>
  );
}

function Directs({ selectedRoomId }) {
  const mx = initMatrix.matrixClient;
  const directIds = [...initMatrix.roomList.directs].sort(AtoZ);

  return directIds.map((id) => renderSelector(mx.getRoom(id), id, selectedRoomId === id, true));
}
Directs.defaultProps = { selectedRoomId: null };
Directs.propTypes = { selectedRoomId: PropTypes.string };

function Home({ selectedRoomId }) {
  const mx = initMatrix.matrixClient;
  const spaceIds = [...initMatrix.roomList.spaces].sort(AtoZ);
  const roomIds = [...initMatrix.roomList.rooms].sort(AtoZ);

  return (
    <>
      { spaceIds.length !== 0 && <Text className="cat-header" variant="b3">Spaces</Text> }
      { spaceIds.map((id) => renderSelector(mx.getRoom(id), id, selectedRoomId === id, false)) }
      { roomIds.length !== 0 && <Text className="cat-header" variant="b3">Channels</Text> }
      { roomIds.map((id) => renderSelector(mx.getRoom(id), id, selectedRoomId === id, false)) }
    </>
  );
}
Home.defaultProps = { selectedRoomId: null };
Home.propTypes = { selectedRoomId: PropTypes.string };

function Channels({ tabId }) {
  const [selectedRoomId, changeSelectedRoomId] = useState(null);
  const [, updateState] = useState();

  const selectHandler = (roomId) => changeSelectedRoomId(roomId);
  const handleDataChanges = () => updateState({});

  const onRoomListChange = () => {
    const { spaces, rooms, directs } = initMatrix.roomList;
    if (!(
      spaces.has(selectedRoomId)
      || rooms.has(selectedRoomId)
      || directs.has(selectedRoomId))
    ) {
      selectRoom(null);
    }
  };

  useEffect(() => {
    navigation.on(cons.events.navigation.ROOM_SELECTED, selectHandler);
    initMatrix.roomList.on(cons.events.roomList.ROOMLIST_UPDATED, handleDataChanges);

    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, selectHandler);
      initMatrix.roomList.removeListener(cons.events.roomList.ROOMLIST_UPDATED, handleDataChanges);
    };
  }, []);
  useEffect(() => {
    initMatrix.roomList.on(cons.events.roomList.ROOMLIST_UPDATED, onRoomListChange);

    return () => {
      initMatrix.roomList.removeListener(cons.events.roomList.ROOMLIST_UPDATED, onRoomListChange);
    };
  }, [selectedRoomId]);

  return (
    <div className="channels-container">
      {
        tabId === 'channels'
          ? <Home selectedRoomId={selectedRoomId} />
          : <Directs selectedRoomId={selectedRoomId} />
      }
    </div>
  );
}
Channels.propTypes = {
  tabId: PropTypes.string.isRequired,
};

function Drawer({ tabId }) {
  return (
    <div className="drawer">
      <DrawerHeader tabId={tabId} />
      <div className="drawer__content-wrapper">
        <DrawerBradcrumb />
        <div className="channels__wrapper">
          <ScrollView autoHide>
            <Channels tabId={tabId} />
          </ScrollView>
        </div>
      </div>
    </div>
  );
}

Drawer.propTypes = {
  tabId: PropTypes.string.isRequired,
};

export default Drawer;
