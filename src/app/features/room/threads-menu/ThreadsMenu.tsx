import React, { forwardRef, MouseEventHandler, useCallback, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Chip,
  config,
  Header,
  Icon,
  IconButton,
  Icons,
  Menu,
  Scroll,
  Text,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';

import * as css from './ThreadsMenu.css';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { ThreadsLoading } from './ThreadsLoading';
import { ThreadsError } from './ThreadsError';
import { useIsDirectRoom, useRoom } from '../../../hooks/useRoom';
import { useRoomThreads } from '../../../hooks/useRoomThreads';
import { VirtualTile } from '../../../components/virtualizer';
import {
  AvatarBase,
  ModernLayout,
  RedactedContent,
  Time,
  Username,
  UsernameBold,
} from '../../../components/message';
import { UserAvatar } from '../../../components/user-avatar';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { PowerIcon } from '../../../components/power';
import {
  getPowerTagIconSrc,
  useAccessiblePowerTagColors,
  useGetMemberPowerTag,
} from '../../../hooks/useMemberPowerTag';
import { useClient } from '../../../hooks/useClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import {
  useObservableValue,
  useObservableValueOptionally,
} from '../../../hooks/useObservableValue';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { useMessageParserOptions } from '../../../hooks/useMessageParserOptions';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { usePowerLevelsContext } from '../../../hooks/usePowerLevels';
import { useRoomCreatorsTag } from '../../../hooks/useRoomCreatorsTag';
import { usePowerLevelTagsContext } from '../../../hooks/usePowerLevelTags';
import { useTheme } from '../../../hooks/useTheme';
import { useSettings } from '../../../state/hooks/settings';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import colorMXID from '../../../../util/colorMXID';
import { getLatestEditEvent } from '../../../utils/room';
import { redacted } from '../../../../client/room/relations';
import { MessageContent } from '../../../components/MessageContent';
import { rContent } from '../../../../client/reader';
import { SequenceCard } from '../../../components/sequence-card';
import { RenderInlineContent } from '../../../components/RenderInlineContent';
import { ThreadTimeline } from '../../../../client/room/ThreadTimeline';
import { getTotalCount, useRoomNotifications } from '../../../state/hooks/roomNotifications';
import { roomToNotificationsAtom } from '../../../state/room/roomToNotifications';
import { UnreadBadge } from '../../../components/unread-badge';

function NoThreads() {
  return (
    <Box
      className={ContainerColor({ variant: 'SurfaceVariant' })}
      style={{
        marginBottom: config.space.S200,
        padding: `${config.space.S700} ${config.space.S400} 60px`,
        borderRadius: config.radii.R300,
      }}
      grow="Yes"
      direction="Column"
      gap="400"
      justifyContent="Center"
      alignItems="Center"
    >
      <Icon src={Icons.Thread} size="600" />
      <Box style={{ maxWidth: '300px' }} direction="Column" gap="200" alignItems="Center">
        <Text size="H4" align="Center">
          No Threads Yet
        </Text>
        <Text size="T400" align="Center">
          Threads will appear here.
        </Text>
      </Box>
    </Box>
  );
}

type ThreadsMenuProps = {
  requestClose: () => void;
};

export const ThreadsMenu = forwardRef<HTMLDivElement, ThreadsMenuProps>(({ requestClose }, ref) => {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const roomId = useRoom();
  const direct = useIsDirectRoom();
  const notifications = useRoomNotifications(roomId, roomToNotificationsAtom);

  const roomToTimeline = useObservableValue(ct.roomToTimeline);
  const timeline = roomToTimeline.get(roomId);
  const redactedSet = useObservableValueOptionally(timeline?.relations.redacted);
  const edits = useObservableValueOptionally(timeline?.relations.edits.eventToRelations);

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);

  const membersAPI = useRoomMembersAPI();
  const { linkifyOpts, htmlReactParserInlineOptions } = useMessageParserOptions(
    roomId,
    getRoomName,
    membersAPI.getName
  );

  const creators = useRoomCreators(roomId);
  const powerLevels = usePowerLevelsContext();

  const getMemberPowerTag = useGetMemberPowerTag(creators, powerLevels);
  const creatorsTag = useRoomCreatorsTag();
  const powerLevelTags = usePowerLevelTagsContext();

  const theme = useTheme();
  const accessibleTagColors = useAccessiblePowerTagColors(theme.kind, creatorsTag, powerLevelTags);

  const { legacyUsernameColor, hour24Clock, dateFormatString } = useSettings();

  const { navigateRoom } = useRoomNavigate();

  const [onlyMy, setOnlyMy] = useState(false);
  const { threads, hasMore, isLoadingMore, isLoading, loadMore, error } = useRoomThreads(
    roomId,
    onlyMy
  );

  const scrollRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 90,
    overscan: 4,
  });

  const handleScroll = useCallback(() => {
    const element = scrollRef.current;

    if (!element) return;

    const isNearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 300;

    if (isNearBottom && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [hasMore, isLoadingMore, loadMore]);

  const hasThreads = threads.length > 0;

  const handleOpenClick: MouseEventHandler = (evt) => {
    evt.stopPropagation();
    const evtId = evt.currentTarget.getAttribute('data-event-id');
    if (!evtId) return;
    timeline?.openThread(evtId);
    navigateRoom(roomId);
    requestClose();
  };

  return (
    <Menu ref={ref} className={css.ThreadsMenu}>
      <Box grow="Yes" direction="Column">
        <Header className={css.ThreadsMenuHeader} size="500">
          <Box grow="Yes" gap="200">
            <Text size="H5">Threads</Text>
          </Box>

          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant="Success"
              radii="Pill"
              fill="None"
              aria-pressed={onlyMy}
              onClick={() => setOnlyMy(!onlyMy)}
              before={<Icon src={Icons.Filter} size="50" />}
            >
              <Text size="L400">Only My</Text>
            </Chip>
            <IconButton size="300" onClick={requestClose} radii="300">
              <Icon src={Icons.Cross} size="400" />
            </IconButton>
          </Box>
        </Header>

        <Box grow="Yes">
          <Scroll ref={scrollRef} size="300" hideTrack visibility="Hover" onScroll={handleScroll}>
            <Box className={css.ThreadsMenuContent} direction="Column" gap="100">
              {isLoading && <ThreadsLoading />}

              {error && <ThreadsError error={error} />}

              {!isLoading && threads && !hasThreads && <NoThreads />}

              {hasThreads && (
                <div
                  style={{
                    position: 'relative',
                    height: virtualizer.getTotalSize(),
                  }}
                >
                  {virtualizer.getVirtualItems().map((vItem) => {
                    const event = threads[vItem.index];

                    if (!event) return null;

                    const displayName = membersAPI.getName(event.sender);

                    const senderAvatarMxc = membersAPI.getAvatar(event.sender);

                    const memberPowerTag = getMemberPowerTag(event.sender);
                    const tagColor = memberPowerTag?.color
                      ? accessibleTagColors?.get(memberPowerTag.color)
                      : undefined;
                    const tagIconSrc = memberPowerTag?.icon
                      ? getPowerTagIconSrc(ct, useAuthentication, memberPowerTag.icon)
                      : undefined;

                    const usernameColor =
                      legacyUsernameColor || direct ? colorMXID(event.sender) : tagColor;

                    const editEvents = edits?.get(event.event_id);
                    const editedEvent = getLatestEditEvent(event, editEvents, redactedSet);

                    const meta = ThreadTimeline.makeThreadMeta(event);
                    const { latestReplyEvent } = meta;

                    const threadNotification = notifications?.threads.get(event.event_id);
                    const count = threadNotification && getTotalCount(threadNotification);

                    return (
                      <VirtualTile
                        key={vItem.key}
                        virtualItem={vItem}
                        ref={virtualizer.measureElement}
                        style={{
                          paddingBottom: config.space.S200,
                        }}
                      >
                        <SequenceCard
                          style={{ padding: `${config.space.S300} ${config.space.S400}` }}
                          variant="SurfaceVariant"
                          direction="Column"
                          gap="200"
                        >
                          <Box shrink="No" alignItems="Center" gap="200">
                            <Box shrink="No" alignItems="Center" gap="200">
                              <Text size="L400">
                                {meta.replyCount} {meta.replyCount === 1 ? 'Reply' : 'Replies'}
                              </Text>
                            </Box>
                            <Box grow="Yes" alignItems="Center" gap="200">
                              <Text size="T200">•</Text>
                              <Text size="T200" truncate>
                                {/* https://forgejo.ellis.link/continuwuation/continuwuity/issues/2167 */}
                                {latestReplyEvent && latestReplyEvent.sender ? (
                                  <>
                                    <span>Last reply by </span>
                                    <b>{membersAPI.getName(latestReplyEvent.sender)}</b>
                                    <span> at </span>
                                    <Time
                                      hour24Clock={hour24Clock}
                                      dateFormatString={dateFormatString}
                                      ts={latestReplyEvent.origin_server_ts}
                                    />
                                  </>
                                ) : (
                                  <span>View Thread</span>
                                )}
                              </Text>
                            </Box>
                            <Box shrink="No" gap="200" alignItems="Center">
                              {count && count > 0 && (
                                <UnreadBadge
                                  highlight={
                                    threadNotification?.highlight_count
                                      ? threadNotification.highlight_count > 0
                                      : false
                                  }
                                  count={count}
                                />
                              )}
                              <Chip
                                data-event-id={event.event_id}
                                onClick={handleOpenClick}
                                variant="Secondary"
                                radii="Pill"
                              >
                                <Text size="T200">Open</Text>
                              </Chip>
                            </Box>
                          </Box>
                          <ModernLayout
                            before={
                              <AvatarBase>
                                <Avatar size="300">
                                  <UserAvatar
                                    userId={event.sender}
                                    src={
                                      senderAvatarMxc
                                        ? mxcToHttp(
                                            ct.session.baseUrl,
                                            senderAvatarMxc,
                                            useAuthentication
                                          ).thumbnail({
                                            width: 96,
                                            height: 96,
                                            method: 'crop',
                                          })
                                        : undefined
                                    }
                                    alt={displayName}
                                    renderFallback={() => (
                                      <Icon size="200" src={Icons.User} filled />
                                    )}
                                  />
                                </Avatar>
                              </AvatarBase>
                            }
                          >
                            <Box
                              gap="300"
                              justifyContent="SpaceBetween"
                              alignItems="Center"
                              grow="Yes"
                            >
                              <Box gap="200" alignItems="Baseline">
                                <Box alignItems="Center" gap="200">
                                  <Username style={{ color: usernameColor }}>
                                    <Text as="span" truncate>
                                      <UsernameBold>{displayName}</UsernameBold>
                                    </Text>
                                  </Username>
                                  {tagIconSrc && <PowerIcon size="100" iconSrc={tagIconSrc} />}
                                </Box>
                                <Time
                                  ts={event.origin_server_ts}
                                  hour24Clock={hour24Clock}
                                  dateFormatString={dateFormatString}
                                />
                              </Box>
                            </Box>
                            {redactedSet?.has(event.event_id) || redacted(event) ? (
                              <RedactedContent />
                            ) : (
                              <MessageContent
                                event={event}
                                editedEvent={editedEvent}
                                roomId={roomId}
                                decryptionManager={ct.decryption}
                              >
                                {(contentEvent) => (
                                  <RenderInlineContent
                                    size="T400"
                                    displayName={membersAPI.getName(event.sender)}
                                    eventType={contentEvent.type}
                                    edited={!!editedEvent}
                                    content={
                                      rContent.newContent(contentEvent.content) ??
                                      contentEvent.content
                                    }
                                    htmlReactParserOptions={htmlReactParserInlineOptions}
                                    linkifyOpts={linkifyOpts}
                                  />
                                )}
                              </MessageContent>
                            )}
                          </ModernLayout>
                        </SequenceCard>
                      </VirtualTile>
                    );
                  })}
                </div>
              )}

              {isLoadingMore && <ThreadsLoading />}
            </Box>
          </Scroll>
        </Box>
      </Box>
    </Menu>
  );
});
