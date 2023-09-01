import React, { useState, useEffect, useRef } from 'react';
import './Client.scss';

import { initHotkeys } from '../../../client/event/hotkeys';
import { initRoomListListener } from '../../../client/event/roomList';

import Text from '../../atoms/text/Text';
import Spinner from '../../atoms/spinner/Spinner';
import Navigation from '../../organisms/navigation/Navigation';
import ContextMenu, { MenuItem } from '../../atoms/context-menu/ContextMenu';
import IconButton from '../../atoms/button/IconButton';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import Room from '../../organisms/room/Room';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';
import EmojiBoardOpener from '../../organisms/emoji-board/EmojiBoardOpener';

import initMatrix from '../../../client/initMatrix';
import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';

import VerticalMenuIC from '../../../../public/res/ic/outlined/vertical-menu.svg';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';

function Client() {
  const [isLoading, changeLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Heating up');
  const classNameHidden = 'client__item-hidden';

  const navWrapperRef = useRef(null);
  const roomWrapperRef = useRef(null);

  function onRoomSelected() {
    navWrapperRef.current?.classList.add(classNameHidden);
    roomWrapperRef.current?.classList.remove(classNameHidden);
  }
  function onNavigationSelected() {
    navWrapperRef.current?.classList.remove(classNameHidden);
    roomWrapperRef.current?.classList.add(classNameHidden);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.ROOM_SELECTED, onRoomSelected);
    navigation.on(cons.events.navigation.NAVIGATION_OPENED, onNavigationSelected);

    return () => {
      navigation.removeListener(cons.events.navigation.ROOM_SELECTED, onRoomSelected);
      navigation.removeListener(cons.events.navigation.NAVIGATION_OPENED, onNavigationSelected);
    };
  }, []);

  useEffect(() => {
    changeLoading(true);
    let counter = 0;
    const iId = setInterval(() => {
      const msgList = ['Almost there...', 'Looks like you have a lot of stuff to heat up!'];
      if (counter === msgList.length - 1) {
        setLoadingMsg(msgList[msgList.length - 1]);
        clearInterval(iId);
        return;
      }
      setLoadingMsg(msgList[counter]);
      counter += 1;
    }, 15000);
    initMatrix.once('init_loading_finished', () => {
      clearInterval(iId);
      initHotkeys();
      initRoomListListener(initMatrix.roomList);
      changeLoading(false);
    });
    initMatrix.init();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-display">
        <div className="loading__menu">
          <ContextMenu
            placement="bottom"
            content={
              <>
                <MenuItem onClick={() => initMatrix.clearCacheAndReload()}>
                  Clear cache & reload
                </MenuItem>
                <MenuItem onClick={() => initMatrix.logout()}>Logout</MenuItem>
              </>
            }
            render={(toggle) => (
              <IconButton size="extra-small" onClick={toggle} src={VerticalMenuIC} />
            )}
          />
        </div>
        <Spinner />
        <Text className="loading__message" variant="b2">
          {loadingMsg}
        </Text>

        <div className="loading__appname">
          <Text variant="h2" weight="medium">
            Cinny
          </Text>
        </div>
      </div>
    );
  }

  return (
    <MatrixClientProvider value={initMatrix.matrixClient}>
      <div className="client-container">
        <div className="navigation__wrapper" ref={navWrapperRef}>
          <Navigation />
        </div>
        <div className={`room__wrapper ${classNameHidden}`} ref={roomWrapperRef}>
          <Room />
        </div>
        <Windows />
        <Dialogs />
        <EmojiBoardOpener />
        <ReusableContextMenu />
      </div>
    </MatrixClientProvider>
  );
}

export default Client;
