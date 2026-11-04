/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { useMemo } from 'react';
import { MessageEventWithoutRoomId, UnreadNotificationCounts } from 'neurone/lib/api/types';
import { Box, Text } from 'folds';
import { HTMLReactParserOptions } from 'html-react-parser';
import { Opts as LinkifyOpts } from 'linkifyjs';
import { Timeline } from '../../../client/room';
import { useObservableValue } from '../../hooks/useObservableValue';
import { NavButton, NavItem } from '../../components/nav';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { ThreadTimeline } from '../../../client/room/ThreadTimeline';
import * as css from './styles.css';
import { MessageContent } from '../../components/MessageContent';
import { useClient } from '../../hooks/useClient';
import { NavItemContent } from '../../components/nav/styles.css';
import { RenderReplyContent } from '../../components/RenderReplyContent';
import { rContent, rUnsigned } from '../../../client/reader';
import { getLatestEditEvent } from '../../utils/room';
import { RedactedContent } from '../../components/message';
import {
  factoryRenderLinkifyWithMention,
  getReactCustomHtmlInlineParser,
  LINKIFY_OPTS,
  makeMentionCustomProps,
  renderMatrixMention,
} from '../../plugins/react-custom-html-parser';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

type ThreadNavItemProps = {
  thread: ThreadTimeline;
  notification?: UnreadNotificationCounts;
  selected: boolean;
  redactedEvents?: Set<string>;
  editEvents?: MessageEventWithoutRoomId[];
  htmlReactParserOptions: HTMLReactParserOptions;
  linkifyOpts: LinkifyOpts;
  onClick: () => void;
};
function ThreadNavItem({
  thread,
  notification,
  selected,
  redactedEvents,
  editEvents,
  htmlReactParserOptions,
  linkifyOpts,
  onClick,
}: ThreadNavItemProps) {
  const ct = useClient();
  const { roomId } = thread;
  const meta = useObservableValue(thread.meta);
  const { rootEvent } = meta ?? {};

  const renderRoot = (event: MessageEventWithoutRoomId) => {
    const editedEvent = getLatestEditEvent(event, editEvents, redactedEvents);

    const redacted =
      redactedEvents?.has(event.event_id) || !!rUnsigned.redactedBecause(event.unsigned);

    if (redacted) {
      return <RedactedContent size="T300" />;
    }

    return (
      <MessageContent
        event={event}
        editedEvent={undefined}
        roomId={roomId}
        decryptionManager={ct.decryption}
        inline
      >
        {(contentEvent) => (
          <RenderReplyContent
            displayName={event.sender}
            eventType={contentEvent.type}
            edited={!!editedEvent}
            content={rContent.newContent(contentEvent.content) ?? contentEvent.content}
            htmlReactParserOptions={htmlReactParserOptions}
            linkifyOpts={linkifyOpts}
          />
        )}
      </MessageContent>
    );
  };

  return (
    <NavItem className={css.ThreadNavItem} variant="Background" radii="400">
      <NavButton onClick={onClick}>
        <Box className={NavItemContent} as="span" grow="Yes" alignItems="Center" gap="200">
          <Box as="span" grow="Yes">
            {rootEvent ? (
              renderRoot(rootEvent)
            ) : (
              <Text as="span" size="T300" truncate>
                loading...
              </Text>
            )}
          </Box>
          {notification && (
            <UnreadBadgeCenter>
              <UnreadBadge
                highlight={(notification.highlight_count ?? 0) > 0}
                count={notification.notification_count ?? 0}
              />
            </UnreadBadgeCenter>
          )}
        </Box>
      </NavButton>
    </NavItem>
  );
}

type ThreadNavItemsProps = {
  timeline: Timeline;
  roomSelected: boolean;
  threadNotifications: Map<string, UnreadNotificationCounts>;
};
export function ThreadNavItems({
  timeline,
  roomSelected,
  threadNotifications,
}: ThreadNavItemsProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const threads = useObservableValue(timeline.threads);
  const edits = useObservableValue(timeline.relations.edits.eventToRelations);
  const redactedSet = useObservableValue(timeline.relations.redacted);

  const activeThread = useObservableValue(timeline.activeThread);

  const linkifyOpts = useMemo<LinkifyOpts>(
    () => ({
      ...LINKIFY_OPTS,
      render: factoryRenderLinkifyWithMention((href) =>
        renderMatrixMention(
          ct,
          timeline.roomId,
          href,
          makeMentionCustomProps((evt) => evt.preventDefault()),
          (userId) => userId,
          (roomId) => ct.roomToName.read.get(roomId) ?? roomId
        )
      ),
    }),
    [ct, timeline]
  );

  const htmlReactParserInlineOptions = useMemo<HTMLReactParserOptions>(
    () =>
      getReactCustomHtmlInlineParser(ct, timeline.roomId, {
        linkifyOpts,
        useAuthentication,
        handleMentionClick: () => undefined,
        getMemberName: (userId) => userId,
        getRoomName: (roomId) => ct.roomToName.read.get(roomId) ?? roomId,
      }),
    [ct, timeline, linkifyOpts, useAuthentication]
  );

  return (
    <Box className={css.ThreadNavItems} direction="Column">
      {Array.from(threadNotifications.keys()).map((threadId) => {
        const notification = threadNotifications.get(threadId);
        if (!notification) return null;
        const thread = threads.get(threadId) ?? timeline.registerThread(threadId);

        return (
          <ThreadNavItem
            key={threadId}
            thread={thread}
            selected={roomSelected && threadId === activeThread}
            notification={notification}
            editEvents={edits.get(threadId)}
            redactedEvents={redactedSet}
            htmlReactParserOptions={htmlReactParserInlineOptions}
            linkifyOpts={linkifyOpts}
            onClick={() => timeline.openThread(threadId)}
          />
        );
      })}
    </Box>
  );
}
