import React, { useMemo, useState } from 'react';
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
import { ObservableValue } from 'neurone/lib/utils/observable';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import * as css from './RoomViewFollowing.css';
import { EventReaders } from '../../components/event-readers';
import { stopPropagation } from '../../utils/keyboard';
import { useClient } from '../../hooks/useClient';
import { useObservableValue, useObservableValuePromise } from '../../hooks/useObservableValue';
import { useRoom } from '../../hooks/useRoom';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';

export function RoomViewFollowingPlaceholder() {
  return <div className={css.RoomViewFollowingPlaceholder} />;
}

export const RoomViewFollowing = as<'div'>(({ className, ...props }, ref) => {
  const [open, setOpen] = useState(false);
  const ct = useClient();
  const roomId = useRoom();
  const membersAPI = useRoomMembersAPI();

  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);
  const latestEvent = roomToLatestEvent.get(roomId);
  const eventId = latestEvent?.event_id;

  const receiptsResult = useObservableValuePromise(
    useMemo(() => {
      if (!eventId) return Promise.resolve(new ObservableValue(undefined, ''));
      return ct.storage.readReceipt.observableRead.queryIndex('eventId', eventId);
    }, [ct, eventId])
  );
  const receipts = receiptsResult.value;

  const names = useMemo(
    () =>
      receipts
        ?.map((receipt) => receipt.userId)
        .filter((readerId) => readerId !== ct.session.userId)
        .map((readerId) => membersAPI.getName(readerId)) ?? [],
    [ct, receipts, membersAPI]
  );

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
                <EventReaders eventId={eventId} requestClose={() => setOpen(false)} />
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
});
