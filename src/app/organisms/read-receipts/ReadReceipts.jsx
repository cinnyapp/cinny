import React, { useState, useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { getUsername } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';

import IconButton from '../../atoms/button/IconButton';
import PeopleSelector from '../../molecules/people-selector/PeopleSelector';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';

function ReadReceipts() {
  const [isOpen, setIsOpen] = useState(false);
  const [roomId, setRoomId] = useState(null);
  const [readReceipts, setReadReceipts] = useState([]);

  function loadReadReceipts(myRoomId, eventId) {
    const mx = initMatrix.matrixClient;
    const room = mx.getRoom(myRoomId);
    const { timeline } = room;
    const myReadReceipts = [];

    const myEventIndex = timeline.findIndex((mEvent) => mEvent.getId() === eventId);

    for (let eventIndex = myEventIndex; eventIndex < timeline.length; eventIndex += 1) {
      myReadReceipts.push(...room.getReceiptsForEvent(timeline[eventIndex]));
    }

    setReadReceipts(myReadReceipts);
    setRoomId(myRoomId);
    setIsOpen(true);
  }

  useEffect(() => {
    navigation.on(cons.events.navigation.READRECEIPTS_OPENED, loadReadReceipts);
    return () => {
      navigation.removeListener(cons.events.navigation.READRECEIPTS_OPENED, loadReadReceipts);
    };
  }, []);

  useEffect(() => {
    if (isOpen === false) {
      setRoomId(null);
      setReadReceipts([]);
    }
  }, [isOpen]);

  function renderPeople(receipt) {
    const room = initMatrix.matrixClient.getRoom(roomId);
    const member = room.getMember(receipt.userId);
    return (
      <PeopleSelector
        key={receipt.userId}
        onClick={() => alert('Viewing profile is yet to be implemented')}
        avatarSrc={member?.getAvatarUrl(initMatrix.matrixClient.baseUrl, 24, 24, 'crop')}
        name={getUsername(receipt.userId)}
        color={colorMXID(receipt.userId)}
      />
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="Seen by"
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip="Close" />}
    >
      {
        readReceipts.map(renderPeople)
      }
    </Dialog>
  );
}

export default ReadReceipts;
