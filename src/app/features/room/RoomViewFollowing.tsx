import React, { useState } from 'react';
import {
  Box,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  as,
  config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';

import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './RoomViewFollowing.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoomLatestRenderedEvent } from '../../hooks/useRoomLatestRenderedEvent';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { EventReaders } from '../../components/event-readers';
import { stopPropagation } from '../../utils/keyboard';

export type RoomViewFollowingProps = {
  room: Room;
};
export const RoomViewFollowing = as<'div', RoomViewFollowingProps>(
  ({ className, room, ...props }, ref) => {
    const mx = useMatrixClient();
    const [open, setOpen] = useState(false);
    const latestEvent = useRoomLatestRenderedEvent(room);
    const latestEventReaders = useRoomEventReaders(room, latestEvent?.getId());
    const names = latestEventReaders
      .filter((readerId) => readerId !== mx.getUserId())
      .map(
        (readerId) => getMemberDisplayName(room, readerId) ?? getMxIdLocalPart(readerId) ?? readerId
      );

    const eventId = latestEvent?.getId();

    return (
      <>
        {eventId && (
          <Overlay open={open} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setOpen(false),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal variant="Surface" size="300">
                  <EventReaders room={room} eventId={eventId} requestClose={() => setOpen(false)} />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
        <Box
          as={names.length > 0 ? 'button' : 'div'}
          onClick={names.length > 0 ? () => setOpen(true) : undefined}
          className={classNames(css.RoomViewFollowing({ clickable: names.length > 0 }), className)}
          alignItems="Center"
          justifyContent="End"
          gap="200"
          {...props}
          ref={ref}
        >
          {names.length > 0 && (
            <>
              <Icon style={{ opacity: config.opacity.P300 }} size="100" src={Icons.CheckTwice} />
              <Text size="T300" truncate>
                {names.length === 1 && (
                  <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' is following the conversation.'}
                    </Text>
                  </>
                )}
                {names.length === 2 && (
                  <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' and '}
                    </Text>
                    <b>{names[1]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' are following the conversation.'}
                    </Text>
                  </>
                )}
                {names.length === 3 && (
                  <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {', '}
                    </Text>
                    <b>{names[1]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' and '}
                    </Text>
                    <b>{names[2]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' are following the conversation.'}
                    </Text>
                  </>
                )}
                {names.length > 3 && (
                  <>
                    <b>{names[0]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {', '}
                    </Text>
                    <b>{names[1]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {', '}
                    </Text>
                    <b>{names[2]}</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' and '}
                    </Text>
                    <b>{names.length - 3} others</b>
                    <Text as="span" size="Inherit" priority="300">
                      {' are following the conversation.'}
                    </Text>
                  </>
                )}
              </Text>
            </>
          )}
        </Box>
      </>
    );
  }
);
