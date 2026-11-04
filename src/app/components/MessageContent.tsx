/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import { DecryptionManager } from '../../client/decryption';
import { MessageEvent } from '../../types/matrix/room';
import { EncryptedMessageEvent } from './encrypted-event';

type MessageContentProps = {
  event: MessageEventWithoutRoomId;
  editedEvent?: MessageEventWithoutRoomId;
  roomId: string;
  decryptionManager: DecryptionManager;
  inline?: boolean;
  children: (event: MessageEventWithoutRoomId) => React.ReactNode;
};

export function MessageContent({
  event,
  editedEvent,
  roomId,
  decryptionManager,
  inline,
  children,
}: MessageContentProps) {
  const effectiveEvent = editedEvent ?? event;

  if (effectiveEvent.type === MessageEvent.RoomMessageEncrypted) {
    return (
      <EncryptedMessageEvent
        roomId={roomId}
        decryptionManager={decryptionManager}
        event={effectiveEvent}
        inline={inline}
      >
        {(decryptedEvent) => children(decryptedEvent)}
      </EncryptedMessageEvent>
    );
  }

  return children(effectiveEvent);
}
