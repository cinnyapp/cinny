import React, { ReactNode, useContext, createContext } from 'react';
import { MessageEvent } from '../../../../types/matrix/room';
import { useClient } from '../../../hooks/useClient';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { useRoom } from '../../../hooks/useRoom';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';

export const CanMessageContext = createContext<boolean>(false);

export function CanMessageProvider({ children }: { children: ReactNode }) {
  const roomId = useRoom();
  const ct = useClient();
  const encrypted = useObservableValue(ct.encryptedRooms).has(roomId);

  const roomToReplacement = useObservableValue(ct.roomToReplacement);
  const replacementRoom = roomToReplacement.get(roomId);

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();

  const permissions = useRoomPermissions(creators, powerLevels);
  const canMessage = permissions.event(MessageEvent.RoomMessage, ct.session.userId);
  const canMessageEncrypted = permissions.event(
    MessageEvent.RoomMessageEncrypted,
    ct.session.userId
  );

  const allowMessage = encrypted ? canMessageEncrypted : canMessage;

  return (
    <CanMessageContext.Provider value={allowMessage || !replacementRoom}>
      {children}
    </CanMessageContext.Provider>
  );
}

export const useCanMessage = (): boolean => useContext(CanMessageContext);
