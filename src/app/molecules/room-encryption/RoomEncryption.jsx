import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomEncryption.scss';
import { EventTimeline } from 'matrix-js-sdk';

import Text from '../../atoms/text/Text';
import Toggle from '../../atoms/button/Toggle';
import SettingTile from '../setting-tile/SettingTile';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { getStateEvents } from '../../utils/room';

function RoomEncryption({ roomId }) {
  const mx = useMatrixClient();
  const room = mx.getRoom(roomId);
  const encryptionEvents = getStateEvents(room, 'm.room.encryption');
  const [isEncrypted, setIsEncrypted] = useState(encryptionEvents.length > 0);
  const canEnableEncryption = room.getLiveTimeline().getState(EventTimeline.FORWARDS).maySendStateEvent('m.room.encryption', mx.getUserId());

  const handleEncryptionEnable = async () => {
    const joinRule = room.getJoinRule();
    const confirmMsg1 = 'It is not recommended to add encryption in public room. Anyone can find and join public rooms, so anyone can read messages in them.';
    const confirmMsg2 = 'Once enabled, encryption for a room cannot be disabled. Messages sent in an encrypted room cannot be seen by the server, only by the participants of the room. Enabling encryption may prevent many bots and bridges from working correctly';

    const isConfirmed1 = (joinRule === 'public')
      ? await confirmDialog('Enable encryption', confirmMsg1, 'Continue', 'caution')
      : true;
    if (!isConfirmed1) return;
    if (await confirmDialog('Enable encryption', confirmMsg2, 'Enable', 'caution')) {
      setIsEncrypted(true);
      mx.sendStateEvent(roomId, 'm.room.encryption', {
        algorithm: 'm.megolm.v1.aes-sha2',
      });
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
