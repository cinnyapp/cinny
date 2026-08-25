import React from 'react';
import { Box, color, config, Icon, Icons, Line, Text } from 'folds';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';
import * as css from './styles.css';
import { Time } from '../../../../components/message';
import { ThreadTimeline } from '../../../../../client/room/ThreadTimeline';
import { useObservableValue } from '../../../../hooks/useObservableValue';
import {
  GetRoomMemberAvatarCallback,
  GetRoomMemberNameCallback,
} from '../../../../hooks/useRoomMembers';
import { useThreadParticipants } from '../../../../hooks/useThreadParticipant';
import { StackedAvatar } from '../../../../components/stacked-avatar';
import { UserAvatar } from '../../../../components/user-avatar';
import { useMediaAuthentication } from '../../../../hooks/useMediaAuthentication';
import { mxcToHttp } from '../../../../../client/mxcToHttp';
import { useClient } from '../../../../hooks/useClient';
import { composerToDraftAtom, getComposerId } from '../../../../state/room/roomInputDrafts';
import { toPlainText } from '../../../../components/editor';

type ThreadSelectorProps = {
  active?: boolean;
  thread: ThreadTimeline;
  outlined?: boolean;
  hour24Clock: boolean;
  dateFormatString: string;
  getMemberName: GetRoomMemberNameCallback;
  getMemberAvatar: GetRoomMemberAvatarCallback;
  onClick?: (threadId: string) => void;
};

export function ThreadSelector({
  active,
  thread,
  outlined,
  hour24Clock,
  dateFormatString,
  getMemberName,
  getMemberAvatar,
  onClick,
}: ThreadSelectorProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();

  const composerId = getComposerId(thread.roomId, thread.threadId);
  const draft = useAtomValue(composerToDraftAtom(composerId));

  const meta = useObservableValue(thread.meta);
  const latestReplyEvent = meta?.latestReplyEvent;
  const participants = useThreadParticipants(thread);

  if (!meta || !latestReplyEvent) {
    return null;
  }

  const max = 5;
  const visibleMembers = participants.slice(0, max);
  const remainingCount = max && participants.length > max ? participants.length - max : 0;

  return (
    <Box
      as="button"
      type="button"
      className={classNames(css.ThreadSelector, outlined && css.ThreadSectorOutlined)}
      alignItems="Center"
      gap="300"
      onClick={() => onClick?.(thread.threadId)}
    >
      {visibleMembers.length > 0 && (
        <Box shrink="No" alignItems="Center">
          {visibleMembers.map((userId) => {
            const name = getMemberName(userId);
            const avatarMxc = getMemberAvatar(userId);

            return (
              <StackedAvatar
                key={userId}
                title={name}
                variant="SurfaceVariant"
                size="200"
                radii="Pill"
              >
                <UserAvatar
                  userId={userId}
                  src={
                    avatarMxc
                      ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
                          width: 48,
                          height: 48,
                          method: 'crop',
                        })
                      : undefined
                  }
                  alt={name}
                  renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                />
              </StackedAvatar>
            );
          })}
          {remainingCount > 0 && (
            <Text size="L400" style={{ paddingLeft: config.space.S100 }}>
              +{remainingCount}
            </Text>
          )}
        </Box>
      )}
      <Box shrink="No" alignItems="Center" gap="200">
        <Text size="L400">
          {meta.replyCount} {meta.replyCount === 1 ? 'Reply' : 'Replies'}
        </Text>
      </Box>
      <Line className={css.ThreadSelectorDivider} direction="Vertical" variant="SurfaceVariant" />
      <Box gap="200" alignItems="Inherit">
        {draft && !active ? (
          <Text size="T200" truncate>
            <strong style={{ color: color.Success.Main }}>Draft: </strong>
            <span>{toPlainText(draft, false).trim()}</span>
          </Text>
        ) : (
          <Text size="T200" truncate>
            {/* https://forgejo.ellis.link/continuwuation/continuwuity/issues/2167 */}
            {latestReplyEvent.sender ? (
              <>
                <span>Last reply by </span>

                <b>{getMemberName(latestReplyEvent.sender)}</b>
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
        )}
        <Icon size="100" src={Icons.ChevronRight} />
      </Box>
    </Box>
  );
}
