import React, { ReactNode, useMemo } from 'react';
import { as, Box, color, config, Icon, Icons, Text } from 'folds';
import { MessageEventWithoutRoomId } from 'neurone/lib/api/types';
import {
  DecryptionManager,
  EventDecryptionIdle,
  EventDecryptionPending,
  EventDecryptionSuccess,
} from '../../../client/decryption';
import { useObservableValue } from '../../hooks/useObservableValue';

export const MessageDecryptionIdle = as<'div', { children?: never }>(({ ...props }, ref) => (
  <Box as="span" alignItems="Center" gap="100" {...props} ref={ref}>
    <Icon size="50" src={Icons.ShieldLock} />
    <i>Decrypt message event to view.</i>
  </Box>
));

export const MessageDecryptionPending = as<'div', { children?: never }>(({ ...props }, ref) => (
  <Box as="span" alignItems="Center" gap="100" {...props} ref={ref}>
    <Icon size="50" src={Icons.Clock} />
    <i>Waiting for message to be decrypted...</i>
  </Box>
));

export const MessageDecryptionError = as<'div', { message: string; children?: never }>(
  ({ message, ...props }, ref) => (
    <Box
      as="span"
      alignItems="Center"
      gap="100"
      style={{ color: color.Critical.Main, opacity: config.opacity.P300 }}
      {...props}
      ref={ref}
    >
      <Icon size="50" src={Icons.Warning} />
      <i>{message}</i>
    </Box>
  )
);

type EncryptedMessageEventProps = {
  decryptionManager: DecryptionManager;
  roomId: string;
  event: MessageEventWithoutRoomId;
  reply?: boolean;
  children: (decryptedEvent: MessageEventWithoutRoomId) => ReactNode;
};
export function EncryptedMessageEvent({
  decryptionManager,
  roomId,
  event,
  reply,
  children,
}: EncryptedMessageEventProps) {
  // Memoize the result because it can return new EncryptedEvent
  // on every call if event content is missing sessionId.
  // It can cause infinite re-renders in pair with `decryption`
  const encryptedEvent = useMemo(
    () => decryptionManager.decryptableMessageEvent(roomId, event),
    [roomId, event, decryptionManager]
  );
  if (encryptedEvent.decryption.read instanceof EventDecryptionIdle) {
    encryptedEvent.decrypt();
  }
  const decryption = useObservableValue(encryptedEvent.decryption);

  if (decryption instanceof EventDecryptionIdle) {
    return (
      <Text size={reply ? 'T300' : 'T400'} truncate={reply}>
        <MessageDecryptionIdle />
      </Text>
    );
  }

  if (decryption instanceof EventDecryptionPending) {
    return (
      <Text size={reply ? 'T300' : 'T400'} truncate={reply}>
        <MessageDecryptionPending />
      </Text>
    );
  }

  if (decryption instanceof EventDecryptionSuccess) {
    return children(decryption.event);
  }

  const { cause, error } = decryption;

  if (cause) {
    return (
      <Text size={reply ? 'T300' : 'T400'} truncate={reply}>
        <MessageDecryptionError
          message={
            cause instanceof Error
              ? cause.message
              : 'Unknown error occurs while decrypting message.'
          }
        />
      </Text>
    );
  }

  if (!error) {
    return (
      <Text>
        <MessageDecryptionError message="Unknown error occurs while decrypting message." />
      </Text>
    );
  }

  return (
    <Text>
      <MessageDecryptionError message={error.description} />
    </Text>
  );
}
