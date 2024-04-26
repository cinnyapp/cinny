import React, { useEffect } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  as,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { JoinRule } from 'matrix-js-sdk';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { SequenceCard } from '../../components/sequence-card';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { millify } from '../../plugins/millify';
import {
  HierarchyRoomSummaryLoader,
  LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { onEnterOrSpace } from '../../utils/keyboard';
import { Membership, RoomType } from '../../../types/matrix/room';
import * as css from './HierarchyItem.css';
import { AsyncStatus } from '../../hooks/useAsyncCallback';
import { ErrorCode } from '../../cs-errorcode';

function RoomProfileLoading() {
  return (
    <Box grow="Yes" gap="300">
      <Avatar className={css.AvatarPlaceholder} />
      <Box grow="Yes" direction="Column" gap="200">
        <Box gap="200" alignItems="Center">
          <Box className={css.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(80) }} />
        </Box>
        <Box gap="200" alignItems="Center">
          <Box className={css.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(40) }} />
          <Box
            className={css.LinePlaceholder}
            shrink="No"
            style={{
              maxWidth: toRem(120),
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}

type RoomProfileErrorProps = {
  roomId: string;
  error: Error;
  suggested?: boolean;
};
function RoomProfileError({ roomId, suggested, error }: RoomProfileErrorProps) {
  const privateRoom = error.name === ErrorCode.M_FORBIDDEN;

  return (
    <Box grow="Yes" gap="300">
      <Avatar>
        <RoomAvatar
          src={undefined}
          alt={roomId}
          renderInitials={() => (
            <RoomIcon
              size="300"
              joinRule={privateRoom ? JoinRule.Invite : JoinRule.Restricted}
              filled
            />
          )}
        />
      </Avatar>
      <Box grow="Yes" direction="Column" gap="100">
        <Box gap="200" alignItems="Center">
          <Text size="H5" truncate>
            Unknown
          </Text>
          {suggested && (
            <Box shrink="No" alignItems="Center">
              <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                <Text size="L400">Suggested</Text>
              </Badge>
            </Box>
          )}
        </Box>
        <Box gap="200" alignItems="Center">
          {privateRoom && (
            <>
              <Badge variant="Secondary" fill="Soft" radii="Pill" outlined>
                <Text size="L400">Private Room</Text>
              </Badge>
              <Line
                variant="SurfaceVariant"
                style={{ height: toRem(12) }}
                direction="Vertical"
                size="400"
              />
            </>
          )}
          <Text size="T200" truncate>
            {roomId}
          </Text>
        </Box>
      </Box>
    </Box>
  );
}

type RoomProfileProps = {
  name: string;
  topic?: string;
  avatarUrl?: string;
  suggested?: boolean;
  memberCount?: number;
  joinRule?: JoinRule;
};
function RoomProfile({
  name,
  topic,
  avatarUrl,
  suggested,
  memberCount,
  joinRule,
}: RoomProfileProps) {
  return (
    <Box grow="Yes" gap="300">
      <Avatar>
        <RoomAvatar
          src={avatarUrl}
          alt={name}
          renderInitials={() => (
            <RoomIcon size="300" joinRule={joinRule ?? JoinRule.Restricted} filled />
          )}
        />
      </Avatar>
      <Box grow="Yes" direction="Column">
        <Box gap="200" alignItems="Center">
          <Text size="H5" truncate>
            {name}
          </Text>
          {suggested && (
            <Box shrink="No" alignItems="Center">
              <Badge variant="Success" fill="Soft" radii="Pill" outlined>
                <Text size="L400">Suggested</Text>
              </Badge>
            </Box>
          )}
        </Box>
        <Box gap="200" alignItems="Center">
          {memberCount && (
            <Box shrink="No" gap="200">
              <Text size="T200" priority="300">{`${millify(memberCount)} Members`}</Text>
            </Box>
          )}
          {memberCount && topic && (
            <Line
              variant="SurfaceVariant"
              style={{ height: toRem(12) }}
              direction="Vertical"
              size="400"
            />
          )}
          {topic && (
            <UseStateProvider initial={false}>
              {(view, setView) => (
                <>
                  <Text
                    className={css.RoomProfileTopic}
                    size="T200"
                    priority="300"
                    truncate
                    onClick={() => setView(true)}
                    onKeyDown={onEnterOrSpace(() => setView(true))}
                    tabIndex={0}
                  >
                    {topic}
                  </Text>
                  <Overlay open={view} backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                      <FocusTrap
                        focusTrapOptions={{
                          initialFocus: false,
                          clickOutsideDeactivates: true,
                          onDeactivate: () => setView(false),
                        }}
                      >
                        <RoomTopicViewer
                          name={name}
                          topic={topic}
                          requestClose={() => setView(false)}
                        />
                      </FocusTrap>
                    </OverlayCenter>
                  </Overlay>
                </>
              )}
            </UseStateProvider>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function CallbackOnFoundSpace({
  roomId,
  onSpaceFound,
}: {
  roomId: string;
  onSpaceFound: (roomId: string) => void;
}) {
  useEffect(() => {
    onSpaceFound(roomId);
  }, [roomId, onSpaceFound]);

  return null;
}

type HierarchyItemCardProps = {
  item: HierarchyItem;
  onSpaceFound: (roomId: string) => void;
  firstChild?: boolean;
  lastChild?: boolean;
};
export const HierarchyItemCard = as<'div', HierarchyItemCardProps>(
  ({ item, onSpaceFound, firstChild, lastChild, ...props }, ref) => {
    const mx = useMatrixClient();
    const { roomId, content } = item;
    const room = mx.getRoom(roomId);

    const joined = room?.getMyMembership() === Membership.Join;

    return (
      <SequenceCard
        className={css.HierarchyItemCard}
        firstChild={firstChild}
        lastChild={lastChild}
        variant="SurfaceVariant"
        gap="300"
        alignItems="Center"
        {...props}
        ref={ref}
      >
        {room ? (
          <LocalRoomSummaryLoader room={room}>
            {(localSummary) => (
              <RoomProfile
                name={localSummary.name}
                topic={localSummary.topic}
                avatarUrl={
                  localSummary.avatarUrl
                    ? mx.mxcUrlToHttp(localSummary.avatarUrl, 96, 96, 'crop') ?? undefined
                    : undefined
                }
                memberCount={localSummary.memberCount}
                suggested={content.suggested}
                joinRule={localSummary.joinRule}
              />
            )}
          </LocalRoomSummaryLoader>
        ) : (
          <HierarchyRoomSummaryLoader roomId={roomId}>
            {(summaryState) => (
              <>
                {summaryState.status === AsyncStatus.Loading && <RoomProfileLoading />}
                {summaryState.status === AsyncStatus.Error && (
                  <RoomProfileError
                    roomId={roomId}
                    error={summaryState.error}
                    suggested={content.suggested}
                  />
                )}
                {summaryState.status === AsyncStatus.Success && (
                  <>
                    {summaryState.data.room_type === RoomType.Space && (
                      <CallbackOnFoundSpace
                        roomId={summaryState.data.room_id}
                        onSpaceFound={onSpaceFound}
                      />
                    )}
                    <RoomProfile
                      name={summaryState.data.name ?? roomId}
                      topic={summaryState.data.topic}
                      avatarUrl={
                        summaryState.data?.avatar_url
                          ? mx.mxcUrlToHttp(summaryState.data.avatar_url, 96, 96, 'crop') ??
                            undefined
                          : undefined
                      }
                      memberCount={summaryState.data.num_joined_members}
                      suggested={content.suggested}
                      joinRule={summaryState.data.join_rule}
                    />
                  </>
                )}
              </>
            )}
          </HierarchyRoomSummaryLoader>
        )}
        <Box shrink="No">
          <Text style={{ color: joined ? 'green' : 'red' }}>{joined ? 'JOINED' : 'NOT'}</Text>
        </Box>
      </SequenceCard>
    );
  }
);
