/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import * as css from './styles.css';
import { EventReaders } from '../../../components/event-readers';
import { stopPropagation } from '../../../utils/keyboard';
import { useClient } from '../../../hooks/useClient';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useEventReciepts } from '../../../hooks/useEventReceipts';

export function FollowingMembersPlaceholder() {
  return <div className={css.FollowingMembersPlaceholder} />;
}

export function FollowingMembers({ eventId, threadId }: { eventId: string; threadId?: string }) {
  const ct = useClient();
  const [open, setOpen] = useState(false);
  const membersAPI = useRoomMembersAPI();

  const receipts = useEventReciepts(eventId, threadId);

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
                <EventReaders
                  eventId={eventId}
                  threadId={threadId}
                  requestClose={() => setOpen(false)}
                />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
      <Box
        as={names.length > 0 ? 'button' : 'div'}
        onClick={names.length > 0 ? () => setOpen(true) : undefined}
        className={css.FollowingMembers({ clickable: names.length > 0 })}
        alignItems="Center"
        justifyContent="End"
        gap="200"
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
