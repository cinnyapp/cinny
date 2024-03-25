import React, { useEffect, useRef } from 'react';
import './Client.scss';

import Navigation from '../../organisms/navigation/Navigation';
import ReusableContextMenu from '../../atoms/context-menu/ReusableContextMenu';
import Windows from '../../organisms/pw/Windows';
import Dialogs from '../../organisms/pw/Dialogs';

import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';

import { ClientContent } from './ClientContent';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting(settingsAtom, 'twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function Client() {
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

  return (
    <div className="client-container">
      {/* <div className="navigation__wrapper" ref={navWrapperRef}>
        <Navigation />
      </div> */}
      <div className={`room__wrapper ${classNameHidden}`} ref={roomWrapperRef}>
        <ClientContent />
      </div>
      <Windows />
      <Dialogs />
      <ReusableContextMenu />
      <SystemEmojiFeature />
    </div>
  );
}

export default Client;
