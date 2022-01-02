import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomEncryption.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import Toggle from '../../atoms/button/Toggle';
import SettingTile from '../setting-tile/SettingTile';

function RoomEncryption({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const encryptionEvents = room.currentState.getStateEvents('m.room.encryption');
  const [isEncrypted, setIsEncrypted] = useState(encryptionEvents.length > 0);
  const canEnableEncryption = room.currentState.maySendStateEvent('m.room.encryption', mx.getUserId());

  const handleEncryptionEnable = () => {
    const joinRule = room.getJoinRule();
    const confirmMsg1 = 'It is not recommended to add encryption in public room. Anyone can find and join public rooms, so anyone can read messages in them.';
    const confirmMsg2 = 'Once enabled, encryption for a room cannot be disabled. Messages sent in an encrypted room cannot be seen by the server, only by the participants of the room. Enabling encryption may prevent many bots and bridges from working correctly';
    if (joinRule === 'public' ? confirm(confirmMsg1) : true) {
      if (confirm(confirmMsg2)) {
        setIsEncrypted(true);
        mx.sendStateEvent(roomId, 'm.room.encryption', {
          algorithm: 'm.megolm.v1.aes-sha2',
        });
      }
    }
  };

  return (
    <div className="room-encryption">
      <SettingTile
        title="Enable room encryption"
        content={(
          <Text variant="b3">Once enabled, encryption cannot be disabled.</Text>
        )}
        options={(
          <Toggle
            isActive={isEncrypted}
            onToggle={handleEncryptionEnable}
            disabled={isEncrypted || !canEnableEncryption}
          />
        )}
      />
    </div>
  );
}

RoomEncryption.propTypes = {
  roomId: PropTypes.string.isRequired,
};

export default RoomEncryption;
