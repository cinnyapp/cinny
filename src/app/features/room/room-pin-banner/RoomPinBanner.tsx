import React, { KeyboardEventHandler, MouseEventHandler, useMemo, useState } from 'react';
import { Room } from 'matrix-js-sdk';
import { Box, Icon, IconButton, Icons, PopOut, RectCords, Text, color } from 'folds';
import FocusTrap from '../../../components/focus-trap';
import { useRoomPinnedEvents } from '../../../hooks/useRoomPinnedEvents';
import { useRoomEvent } from '../../../hooks/useRoomEvent';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { getMemberDisplayName } from '../../../utils/room';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { stopPropagation } from '../../../utils/keyboard';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { RoomPinMenu } from '../room-pin-menu';
import { getPinnedEventSnippet } from './pinnedEventText';
import * as css from './RoomPinBanner.css';

type PinnedPreviewProps = {
  room: Room;
  eventId: string;
};
function PinnedPreview({ room, eventId }: PinnedPreviewProps) {
  // `undefined` = still loading, `null` = could not be fetched. Pinned events
  // are often outside the loaded timeline, so this hook fetches and decrypts
  // them (the Pinned Messages list uses the same one).
  const pinnedEvent = useRoomEvent(room, eventId);

  if (pinnedEvent === undefined) {
    return (
      <Text size="T200" priority="300" truncate>
        Loading pinned message…
      </Text>
    );
  }

  if (pinnedEvent === null) {
    return (
      <Text size="T200" style={{ color: color.Critical.Main }} truncate>
        Pinned message unavailable
      </Text>
    );
  }

  const sender = pinnedEvent.getSender();
  const displayName = sender
    ? getMemberDisplayName(room, sender) ?? getMxIdLocalPart(sender) ?? sender
    : undefined;

  return (
    <Text size="T200" truncate>
      {displayName && (
        <Text as="span" size="T200" priority="500">
          {`${displayName}: `}
        </Text>
      )}
      <Text as="span" size="T200" priority="300">
        {getPinnedEventSnippet(pinnedEvent)}
      </Text>
    </Text>
  );
}

type RoomPinBannerProps = {
  room: Room;
};

/**
 * A compact "Pinned" bar above the timeline, the one pinned-messages surface
 * upstream Cinny lacks compared to Element Web / Element X.
 *
 * It is a *view* of the standard `m.room.pinned_events` room state, so pins
 * created by any other client show up here, and "View all" opens the existing
 * `RoomPinMenu` rather than duplicating the list.
 */
export function RoomPinBanner({ room }: RoomPinBannerProps) {
  const [showPinnedBanner] = useSetting(settingsAtom, 'showPinnedBanner');
  const pinnedEvents = useRoomPinnedEvents(room);
  // Newest pin first — the order the Pinned Messages list uses.
  const orderedPins = useMemo(() => Array.from(pinnedEvents).reverse(), [pinnedEvents]);
  const [index, setIndex] = useState(0);
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const { navigateRoom } = useRoomNavigate();

  // The list can shrink under us (someone unpins), so clamp instead of holding
  // a stale index.
  const safeIndex = orderedPins.length === 0 ? 0 : Math.min(index, orderedPins.length - 1);
  const eventId = orderedPins[safeIndex];

  const handleJump = () => {
    if (eventId) navigateRoom(room.roomId, eventId);
  };

  const handleKeyDown: KeyboardEventHandler<HTMLDivElement> = (evt) => {
    if (evt.key === 'Enter' || evt.key === ' ') {
      evt.preventDefault();
      handleJump();
    }
  };

  const handlePrev = () => {
    setIndex((i) => {
      const current = Math.min(i, orderedPins.length - 1);
      return current <= 0 ? orderedPins.length - 1 : current - 1;
    });
  };

  const handleNext = () => {
    setIndex((i) => {
      const current = Math.min(i, orderedPins.length - 1);
      return current >= orderedPins.length - 1 ? 0 : current + 1;
    });
  };

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };

  if (!showPinnedBanner || !eventId) return null;

  return (
    <Box className={css.PinBanner} shrink="No" alignItems="Center">
      <Box
        className={css.PinBannerBody}
        grow="Yes"
        alignItems="Center"
        role="button"
        tabIndex={0}
        aria-label="Jump to pinned message"
        onClick={handleJump}
        onKeyDown={handleKeyDown}
      >
        <Icon size="100" src={Icons.Pin} />
        <Box className={css.PinBannerText} grow="Yes" direction="Column">
          <PinnedPreview room={room} eventId={eventId} />
        </Box>
        {orderedPins.length > 1 && (
          <Text size="T200" priority="300">
            {`${safeIndex + 1}/${orderedPins.length}`}
          </Text>
        )}
      </Box>
      {orderedPins.length > 1 && (
        <>
          <IconButton
            size="300"
            radii="300"
            variant="Background"
            fill="None"
            onClick={handlePrev}
            aria-label="Previous pinned message"
          >
            <Icon size="100" src={Icons.ChevronTop} />
          </IconButton>
          <IconButton
            size="300"
            radii="300"
            variant="Background"
            fill="None"
            onClick={handleNext}
            aria-label="Next pinned message"
          >
            <Icon size="100" src={Icons.ChevronBottom} />
          </IconButton>
        </>
      )}
      <IconButton
        size="300"
        radii="300"
        variant="Background"
        fill="None"
        onClick={handleOpenMenu}
        aria-pressed={!!menuAnchor}
        aria-label={`View all ${orderedPins.length} pinned messages`}
      >
        <Icon size="100" src={Icons.VerticalDots} />
      </IconButton>
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <RoomPinMenu room={room} requestClose={() => setMenuAnchor(undefined)} />
          </FocusTrap>
        }
      />
    </Box>
  );
}
