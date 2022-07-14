import React, { useState } from 'react';
import PropTypes from 'prop-types';
import './RoomEncryption.scss';

import initMatrix from '../../../client/initMatrix';

import Text from '../../atoms/text/Text';
import Toggle from '../../atoms/button/Toggle';
import SettingTile from '../setting-tile/SettingTile';

import { confirmDialog } from '../confirm-dialog/ConfirmDialog';

import '../../i18n.jsx'
import { useTranslation } from 'react-i18next';

function RoomEncryption({ roomId }) {
  const mx = initMatrix.matrixClient;
  const room = mx.getRoom(roomId);
  const encryptionEvents = room.currentState.getStateEvents('m.room.encryption');
  const [isEncrypted, setIsEncrypted] = useState(encryptionEvents.length > 0);
  const canEnableEncryption = room.currentState.maySendStateEvent('m.room.encryption', mx.getUserId());

  const { t } = useTranslation();

  const handleEncryptionEnable = async () => {
    const joinRule = room.getJoinRule();
    const confirmMsg1 = t("Molecules.RoomEncryption.encryption_public_room_message");
    const confirmMsg2 = t("Molecules.RoomEncryption.encryption_message");

    const isConfirmed1 = (joinRule === 'public')
      ? await confirmDialog(t("Molecules.RoomEncryption.enable_encryption_prompt"), confirmMsg1, t("Molecules.RoomEncryption.continue_button"), 'caution')
      : true;
    if (!isConfirmed1) return;
    if (await confirmDialog(t("Molecules.RoomEncryption.enable_encryption_prompt"), confirmMsg2, t("Molecules.RoomEncryption.enable_encryption_button"), 'caution')) {
      setIsEncrypted(true);
      mx.sendStateEvent(roomId, 'm.room.encryption', {
        algorithm: 'm.megolm.v1.aes-sha2',
      });
    }
  };

  return (
    <div className="room-encryption">
      <SettingTile
        title={t("Molecules.RoomEncryption.enable_room_encryption")}
        content={(
          <Text variant="b3">{t("Molecules.RoomEncryption.encryption_cannot_be_disabled")}</Text>
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
