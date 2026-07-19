import { useCallback } from 'react';
import {
  EncryptionSettings,
  HistoryVisibility,
  RoomEncryptionSettings,
} from 'neurone/lib/crypto/machine';
import { ObjectReader } from 'neurone/lib/utils';
import { useClient } from '../../../hooks/useClient';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';

export function buildEncryptionSettings(
  historyVisibility: HistoryVisibility,
  roomSettings: RoomEncryptionSettings | undefined,
  encryptionEventContent: object | undefined
): EncryptionSettings {
  const rotationPeriodMs = ObjectReader.number(encryptionEventContent, 'rotation_period_ms');

  const rotationPeriodMsgs = ObjectReader.number(encryptionEventContent, 'rotation_period_msgs');

  const rotationMilliseconds = roomSettings?.sessionRotationPeriodMs ?? rotationPeriodMs;

  return {
    algorithm: 'm.megolm.v1.aes-sha2',
    historyVisibility,
    encryptStateEvents: roomSettings?.encryptStateEvents,
    // EncryptionSettings expects microseconds.
    rotationPeriod: rotationMilliseconds === undefined ? undefined : rotationMilliseconds * 1_000,
    rotationPeriodMessages: roomSettings?.sessionRotationPeriodMessages ?? rotationPeriodMsgs,
    sharingStrategy: roomSettings?.onlyAllowTrustedDevices ? 'only-trusted-devices' : 'all-devices',
  };
}

export const useEnsureRoomEncryptionSession = () => {
  const ct = useClient();
  const roomId = useRoom();

  const { memberEventsResult, getMembership } = useRoomMembersAPI();

  const prepareEncryptionSession = useCallback(async () => {
    if (!ct.encryptedRooms.read.has(roomId)) {
      return;
    }
    const historyVisibility = ct.roomToHistoryVisibility.read.get(roomId) ?? 'shared';
    const encryptForInvited = historyVisibility !== 'joined';

    // TODO: make sure all members are loaded.
    const targetMembers = memberEventsResult.value
      ?.map((e) => e.userId)
      .filter((userId) => {
        const membership = getMembership(userId);
        return membership === 'join' || (membership === 'invite' && encryptForInvited);
      });

    if (!targetMembers) return;

    await ct.machine.userTracker.track(targetMembers);
    await ct.machine.outgoingRequests.processAll();
    await ct.machine.outgoingRequests.claimKeys(targetMembers);

    const roomSettings = await ct.machine.roomEncryption.getSettings(roomId);
    const encryptionEventContent = ct.state.join.encryption.read.find((ev) => ev.roomId === roomId)
      ?.event.content;

    const encryptionSettings: EncryptionSettings = buildEncryptionSettings(
      historyVisibility,
      roomSettings,
      encryptionEventContent
    );

    await ct.machine.roomKeys.shareRoomKey(roomId, targetMembers, encryptionSettings);
  }, [ct, roomId, memberEventsResult, getMembership]);

  return prepareEncryptionSession;
};
