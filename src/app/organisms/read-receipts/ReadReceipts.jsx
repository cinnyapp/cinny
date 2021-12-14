import React, { useState, useEffect } from 'react';

import initMatrix from '../../../client/initMatrix';
import cons from '../../../client/state/cons';
import navigation from '../../../client/state/navigation';
import { getUsername, getUsernameOfRoomMember } from '../../../util/matrixUtil';
import colorMXID from '../../../util/colorMXID';

import IconButton from '../../atoms/button/IconButton';
import PeopleSelector from '../../molecules/people-selector/PeopleSelector';
import Dialog from '../../molecules/dialog/Dialog';

import CrossIC from '../../../../public/res/ic/outlined/cross.svg';
import { openProfileViewer } from '../../../client/action/navigation';

function ReadReceipts() {
  const [isOpen, setIsOpen] = useState(false);
  const [readers, setReaders] = useState([]);
  const [roomId, setRoomId] = useState(null);

  useEffect(() => {
    const loadReadReceipts = (rId, userIds) => {
      setReaders(userIds);
      setRoomId(rId);
      setIsOpen(true);
    };
    navigation.on(cons.events.navigation.READRECEIPTS_OPENED, loadReadReceipts);
    return () => {
      navigation.removeListener(cons.events.navigation.READRECEIPTS_OPENED, loadReadReceipts);
    };
  }, []);

  const handleAfterClose = () => {
    setReaders([]);
    setRoomId(null);
  };

  function renderPeople(userId) {
    const room = initMatrix.matrixClient.getRoom(roomId);
    const member = room.getMember(userId);
    const getUserDisplayName = () => {
      if (room?.getMember(userId)) return getUsernameOfRoomMember(room.getMember(userId));
      return getUsername(userId);
    };
    return (
      <PeopleSelector
        key={userId}
        onClick={() => {
          setIsOpen(false);
          openProfileViewer(userId, roomId);
        }}
        avatarSrc={member?.getAvatarUrl(initMatrix.matrixClient.baseUrl, 24, 24, 'crop')}
        name={getUserDisplayName(userId)}
        color={colorMXID(userId)}
      />
    );
  }

  return (
    <Dialog
      isOpen={isOpen}
      title="Seen by"
      onAfterClose={handleAfterClose}
      onRequestClose={() => setIsOpen(false)}
      contentOptions={<IconButton src={CrossIC} onClick={() => setIsOpen(false)} tooltip="Close" />}
    >
      {
        readers.map(renderPeople)
      }
    </Dialog>
  );
}

export default ReadReceipts;
