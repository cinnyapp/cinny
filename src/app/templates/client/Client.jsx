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

import initMatrix from '../../../client/initMatrix';
import navigation from '../../../client/state/navigation';
import cons from '../../../client/state/cons';
import DragDrop from '../../organisms/drag-drop/DragDrop';

function Client() {
  const [isLoading, changeLoading] = useState(true);
  const [loadingMsg, setLoadingMsg] = useState('Heating up');
  const [dragCounter, setDragCounter] = useState(0);

  useEffect(() => {
    let counter = 0;
    const iId = setInterval(() => {
      const msgList = [
        'Almost there...',
        'Looks like you have a lot of stuff to heat up!',
      ];
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

  function dragContainsFiles(e) {
    if (!e.dataTransfer.types) return false;

    for (let i = 0; i < e.dataTransfer.types.length; i += 1) {
      if (e.dataTransfer.types[i] === 'Files') return true;
    }
    return false;
  }

  function modalOpen() {
    return navigation.isRawModalVisible && dragCounter <= 0;
  }

  function handleDragOver(e) {
    if (!dragContainsFiles(e)) return;

    e.preventDefault();

    if (!navigation.selectedRoomId || modalOpen()) {
      e.dataTransfer.dropEffect = 'none';
    }
  }

  function handleDragEnter(e) {
    e.preventDefault();

    if (navigation.selectedRoomId && !modalOpen() && dragContainsFiles(e)) {
      setDragCounter(dragCounter + 1);
    }
  }

  function handleDragLeave(e) {
    e.preventDefault();

    if (navigation.selectedRoomId && !modalOpen() && dragContainsFiles(e)) {
      setDragCounter(dragCounter - 1);
    }
  }

  function handleDrop(e) {
    e.preventDefault();

    setDragCounter(0);

    if (modalOpen()) return;

    const roomId = navigation.selectedRoomId;
    if (!roomId) return;

    const { files } = e.dataTransfer;
    if (!files?.length) return;
    const file = files[0];
    initMatrix.roomsInput.setAttachment(roomId, file);
    initMatrix.roomsInput.emit(cons.events.roomsInput.ATTACHMENT_SET, file);
  }

  return (
    <div
      className="client-container"
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="navigation__wrapper">
        <Navigation />
      </div>
      <div className="room__wrapper">
        <Room />
      </div>
      <Windows />
      <Dialogs />
      <EmojiBoardOpener />
      <ReusableContextMenu />
      <DragDrop isOpen={dragCounter !== 0} />
    </div>
  );
}

export default Client;
