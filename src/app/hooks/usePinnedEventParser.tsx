import { MatrixEvent } from 'matrix-js-sdk';
import React, { ReactNode, useCallback } from 'react';
import { RoomPinnedEventsEventContent } from 'matrix-js-sdk/lib/types';
import { getMxIdLocalPart } from '../utils/matrix';
import { EventActionButton } from '../components/event-action-button/EventActionButton';
import { useRoomNavigate } from './useRoomNavigate';
import { singleOrNull } from '../utils/common';

export type PinnedEventParser = (mEvent: MatrixEvent) => ReactNode | null;

export const usePinnedEventParser = (roomId: string): PinnedEventParser => {
  const { navigateRoom } = useRoomNavigate();

  const navigate = useCallback(
    (eventId: string) => {
      navigateRoom(roomId, eventId);
    },
    [navigateRoom, roomId]
  );

  const pinnedEventParser = (mEvent: MatrixEvent) => {
    const { pinned } = mEvent.getContent<RoomPinnedEventsEventContent>();
    const prevPinned = (mEvent.getPrevContent() as Partial<RoomPinnedEventsEventContent>).pinned;
    const senderId = mEvent.getSender() ?? '';
    const senderName = getMxIdLocalPart(senderId);

    const addedPins = pinned.filter((event) => !(prevPinned?.includes(event) ?? false));
    const removedPins = prevPinned?.filter((event) => !pinned.includes(event)) ?? [];
    const bodyMessages: string[] = [];

    // if only one event was added/removed total, show a link to jump to it
    const jumpTarget = singleOrNull(addedPins.concat(removedPins));

    // if this event didn't change anything, don't show the message at all
    if (addedPins.length === 0 && removedPins.length === 0) {
      return null;
    }

    // check for added pins
    if (addedPins.length > 0) {
      if (addedPins.length === 1) {
        bodyMessages.push('pinned a message');
      } else {
        bodyMessages.push(`pinned ${addedPins.length} messages`);
      }
    }

    // check for removed pins
    if (removedPins.length > 0) {
      if (removedPins.length === 1) {
        bodyMessages.push('unpinned a message');
      } else {
        bodyMessages.push(`unpinned ${removedPins.length} messages`);
      }
    }

    return (
      <>
        <b>{senderName}</b>
        {` ${bodyMessages.join(' and ')}. `}
        {jumpTarget && (
          <EventActionButton onClick={() => navigate(jumpTarget)}>
            <b>View Message</b>
          </EventActionButton>
        )}
      </>
    );
  };
  return pinnedEventParser;
};
