import React, { useCallback, useMemo } from 'react';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { ImagePackContent } from './ImagePackContent';
import { ImagePack, PackContent } from '../../plugins/custom-emoji';
import { StateEventType } from '../../../types/matrix/room';
import { useRoomImagePack } from '../../hooks/useImagePacks';
import { randomStr } from '../../utils/common';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { useClient } from '../../hooks/useClient';

type RoomImagePackProps = {
  roomId: string;
  stateKey: string;
};

export function RoomImagePack({ roomId, stateKey }: RoomImagePackProps) {
  const ct = useClient();
  const { userId } = ct.session;
  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(roomId);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canEditImagePack = permissions.stateEvent(StateEventType.PoniesRoomEmotes, userId);

  const fallbackPack = useMemo(() => {
    const fakePackId = randomStr(4);
    return new ImagePack(
      fakePackId,
      {},
      {
        roomId,
        stateKey,
      }
    );
  }, [roomId, stateKey]);
  const imagePackResult = useRoomImagePack(roomId, stateKey);
  const imagePack = imagePackResult.value ?? fallbackPack;

  const handleUpdate = useCallback(
    async (packContent: PackContent) => {
      const { address } = imagePack;
      if (!address) return;

      await ct.requestAuthJSON(
        putStateEvent({
          pathParams: {
            roomId: address.roomId,
            eventType: StateEventType.PoniesRoomEmotes,
            stateKey: address.stateKey,
          },
          body: packContent,
        })
      );
    },
    [ct, imagePack]
  );

  return (
    <ImagePackContent imagePack={imagePack} canEdit={canEditImagePack} onUpdate={handleUpdate} />
  );
}
