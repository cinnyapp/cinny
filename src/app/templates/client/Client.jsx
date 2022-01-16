import React, { useState, useEffect } from 'react';
import './Client.scss';

import Text from '../../atoms/text/Text';
import Spinner from '../../atoms/spinner/Spinner';
import Navigation from '../../organisms/navigation/Navigation';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import Room from '../../organisms/room/Room';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';
import EmojiBoardOpener from '../../organisms/emoji-board/EmojiBoardOpener';
import logout from '../../../client/action/logout';
import cons from '../../../client/state/cons';

import initMatrix from '../../../client/initMatrix';
import navigation from '../../../client/state/navigation';

function Client() {
  const [mobileSize, setMobileSize] = useState(false);
  const [isLoading, changeLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Heating up');
  const [onNavView, setOnNavRoom] = useState(true); // User can be on RoomView or Navigation

  // Check if screen size is small
  const updateMobileSize = () => {
    setMobileSize(window.innerWidth < 750);
    console.log('Mobile size: ', mobileSize);
  };
  useEffect(() => {
    window.addEventListener('resize', updateMobileSize);

    return (() => {
      window.removeEventListener('resize', updateMobileSize);
    });
  }, [mobileSize]);

  // Liston on events if mobile
  const tada = (ev) => {
    console.log('Room selected', ev);
    setOnNavRoom(false);
  };
  const da = (ev) => {
    console.log('Nav selected', ev);
    setOnNavRoom(true);
  };
  useEffect(() => {
    navigation.on(cons.events.navigation.ROOM_SELECTED, tada);
    navigation.on(cons.events.navigation.OPEN_NAVIGATION, da);
    // appDispatcher.register(cons.events.navigation.ROOM_SELECTED, () => setOnNavRoom(false));

    return (() => {
      navigation.removeListener(tada);
    });
  }, []);

  // Startup
  useEffect(() => {
    let counter = 0;
    const iId = setInterval(() => {
      const msgList = [
        'Sometimes it takes a while...',
        'Looks like you have a lot of stuff to heat up!',
      ];
      if (counter === msgList.length - 1) {
        setLoadingMsg(msgList[msgList.length - 1]);
        clearInterval(iId);
        return;
      }
      setLoadingMsg(msgList[counter]);
      counter += 1;
    }, 9000);
    initMatrix.once('init_loading_finished', () => {
      clearInterval(iId);
      changeLoading(false);
    });
    initMatrix.init();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-display">
        <button className="loading__logout" onClick={logout} type="button">
          <Text variant="b3">Logout</Text>
        </button>
        <Spinner />
        <Text className="loading__message" variant="b2">{loadingMsg}</Text>

        <div className="loading__appname">
          <Text variant="h2" weight="medium">Cinny</Text>
        </div>
      </div>
    );
  }
  return (
    <div className="client-container">
      <div className={`navigation__wrapper ${mobileSize && onNavView === false ? 'hidden' : ''} ${mobileSize ? 'nav-selected' : ''}`}>
        <Navigation />
      </div>
      <div className={`room__wrapper ${mobileSize && onNavView === true ? 'hidden' : ''}`}>
        <Room />
      </div>
      <Windows />
      <Dialogs />
      <EmojiBoardOpener />
      <ReusableContextMenu />
    </div>
  );
}

export default Client;
