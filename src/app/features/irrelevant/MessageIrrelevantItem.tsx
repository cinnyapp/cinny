import React from 'react';
import { Icon, Icons, MenuItem, Text, as } from 'folds';
import { MatrixEvent, Room } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { IRRELEVANT_REACTION_KEY } from './irrelevant';

type MessageIrrelevantItemProps = {
  room: Room;
  mEvent: MatrixEvent;
  /** Current 🙈 marker reactions on this message (any sender). */
  markers: MatrixEvent[];
  /** Whether the user may redact other people's events (room power level). */
  canRedact?: boolean;
  canSendReaction?: boolean;
  onReactionToggle: (targetEventId: string, key: string, shortcode?: string) => void;
  onClose?: () => void;
};

/**
 * "Mark as irrelevant" / "Unmark as irrelevant" entry of the message options menu.
 * Marking sends the 🙈 marker reaction; unmarking redacts our own marker and — if we have the
 * power to redact — everyone else's, so the message shows normally again for both sides.
 */
export const MessageIrrelevantItem = as<'button', MessageIrrelevantItemProps>(
  (
    { room, mEvent, markers, canRedact, canSendReaction, onReactionToggle, onClose, ...props },
    ref
  ) => {
    const mx = useMatrixClient();
    const myUserId = mx.getUserId();

    const myMarker = markers.find((ev) => ev.getSender() === myUserId);
    const otherMarkers = markers.filter((ev) => ev.getSender() !== myUserId);
    const marked = markers.length > 0;

    const canMark = !marked && !!canSendReaction;
    const canUnmark = marked && (!!myMarker || (otherMarkers.length > 0 && !!canRedact));
    if (!canMark && !canUnmark) return null;

    const handleClick = () => {
      const eventId = mEvent.getId();
      if (!eventId) return;
      if (!marked || myMarker) {
        // toggle: sends our marker when absent, redacts it when present
        onReactionToggle(eventId, IRRELEVANT_REACTION_KEY);
      }
      if (marked && canRedact) {
        otherMarkers.forEach((ev) => {
          const markerId = ev.getId();
          if (markerId) mx.redactEvent(room.roomId, markerId).catch(() => undefined);
        });
      }
      onClose?.();
    };

    return (
      <MenuItem
        size="300"
        after={<Icon size="100" src={marked ? Icons.Eye : Icons.EyeBlind} />}
        radii="300"
        onClick={handleClick}
        {...props}
        ref={ref}
      >
        <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
          {marked ? 'Unmark as irrelevant' : 'Mark as irrelevant'}
        </Text>
      </MenuItem>
    );
  }
);
