import React, { MouseEventHandler, ReactNode, useCallback, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  Icon,
  Icons,
  Line,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  Tooltip,
  as,
  color,
  toRem,
  PopOut,
  RectCords,
  IconButton,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { SpaceHierarchyRoomChunk } from 'neurone/lib/api/types';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { postJoin } from 'neurone/lib/api/matrix/client/v3/join';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { SequenceCard } from '../../components/sequence-card';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { millify } from '../../plugins/millify';
import { LocalRoomSummaryLoader } from '../../components/RoomSummaryLoader';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { onEnterOrSpace, stopPropagation } from '../../utils/keyboard';
import { JoinRule } from '../../../types/matrix/room';
import * as css from './RoomItem.css';
import * as styleCss from './style.css';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ItemDraggableTarget, useDraggableItem } from './DnD';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useClient } from '../../hooks/useClient';
import { BreakWord } from '../../styles/Text.css';
import { mxcToHttp } from '../../../client/mxcToHttp';

type RoomJoinButtonProps = {
  roomId: string;
  via?: string[];
};
function RoomJoinButton({ roomId, via }: RoomJoinButtonProps) {
  const ct = useClient();

  const [joinState, join] = useAsyncCallback(
    useCallback(async () => {
      const resp = await ct.requestAuthJSON(
        postJoin({
          pathParams: { roomIdOrAlias: roomId },
          searchParams: { via, server_name: via },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(printMatrixError(err));
    }, [ct, roomId, via])
  );

  const canJoin = joinState.status === AsyncStatus.Idle || joinState.status === AsyncStatus.Error;

  const [cords, setCords] = useState<RectCords>();
  const handleErrorMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <Box shrink="No" gap="200" alignItems="Center">
      {joinState.status === AsyncStatus.Error && (
        <PopOut
          anchor={cords}
          content={
            <Tooltip variant="Critical" style={{ maxWidth: toRem(200) }}>
              <Box direction="Column" gap="100">
                <Text className={BreakWord} size="T400">
                  {typeof joinState.error === 'object' && joinState.error instanceof Error
                    ? joinState.error.message
                    : 'Unknown error'}
                </Text>
              </Box>
            </Tooltip>
          }
        >
          <IconButton variant="SurfaceVariant" radii="300" size="300" onClick={handleErrorMenu}>
            <Icon
              style={{ color: color.Critical.Main, cursor: 'pointer' }}
              src={Icons.Warning}
              size="200"
              filled
              tabIndex={0}
              aria-label="Join room error message"
            />
          </IconButton>
        </PopOut>
      )}
      <Chip
        variant="Secondary"
        fill="Soft"
        size="400"
        radii="Pill"
        before={
          canJoin ? <Icon src={Icons.Plus} size="50" /> : <Spinner variant="Secondary" size="100" />
        }
        onClick={join}
        disabled={!canJoin}
      >
        <Text size="B300">Join</Text>
      </Chip>
    </Box>
  );
}

function RoomProfileLoading() {
  return (
    <Box grow="Yes" gap="300">
      <Avatar className={styleCss.AvatarPlaceholder} />
      <Box grow="Yes" direction="Column" gap="100">
        <Box gap="200" alignItems="Center">
          <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(80) }} />
        </Box>
        <Box gap="200" alignItems="Center">
          <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(40) }} />
          <Box
            className={styleCss.LinePlaceholder}
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
  inaccessibleRoom: boolean;
  suggested?: boolean;
  via?: string[];
};
function RoomProfileError({ roomId, suggested, inaccessibleRoom, via }: RoomProfileErrorProps) {
  return (
    <Box grow="Yes" gap="300">
      <Avatar>
        <RoomAvatar
          roomId={roomId}
          src={undefined}
          alt={roomId}
          renderFallback={() => (
            <RoomIcon size="300" joinRule={inaccessibleRoom ? 'invite' : 'restricted'} filled />
          )}
        />
      </Avatar>
      <Box grow="Yes" direction="Column" className={css.ErrorNameContainer}>
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
          {inaccessibleRoom ? (
            <Badge variant="Secondary" fill="Soft" radii="300" size="500">
              <Text size="L400">Inaccessible</Text>
            </Badge>
          ) : (
            <Text size="T200" truncate>
              {roomId}
            </Text>
          )}
        </Box>
      </Box>
      {!inaccessibleRoom && <RoomJoinButton roomId={roomId} via={via} />}
    </Box>
  );
}

type RoomProfileProps = {
  roomId: string;
  roomType?: string;
  name: string;
  topic?: string;
  avatarUrl?: string;
  suggested?: boolean;
  memberCount?: number;
  joinRule?: JoinRule;
  options?: ReactNode;
};
function RoomProfile({
  roomId,
  roomType,
  name,
  topic,
  avatarUrl,
  suggested,
  memberCount,
  joinRule,
  options,
}: RoomProfileProps) {
  return (
    <Box grow="Yes" gap="300">
      <Avatar>
        <RoomAvatar
          roomId={roomId}
          src={avatarUrl}
          alt={name}
          renderFallback={() => <RoomIcon size="300" joinRule={joinRule} roomType={roomType} />}
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
                          escapeDeactivates: stopPropagation,
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
      {options}
    </Box>
  );
}

type RoomItemCardProps = {
  item: HierarchyItem;
  loading: boolean;
  error: unknown;
  summary: SpaceHierarchyRoomChunk | undefined;
  firstChild?: boolean;
  lastChild?: boolean;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  joined?: boolean;
  options?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  onDragging: (item?: HierarchyItem) => void;
  canReorder: boolean;
};
export const RoomItemCard = as<'div', RoomItemCardProps>(
  (
    {
      item,
      loading,
      error,
      summary,
      onOpen,
      joined,
      options,
      before,
      after,
      onDragging,
      canReorder,
      ...props
    },
    ref
  ) => {
    const ct = useClient();
    const useAuthentication = useMediaAuthentication();
    const { roomId, content } = item;
    const targetRef = useRef<HTMLDivElement>(null);
    const targetHandleRef = useRef<HTMLDivElement>(null);
    useDraggableItem(item, targetRef, onDragging, targetHandleRef);

    return (
      <SequenceCard
        className={css.RoomItemCard}
        variant="SurfaceVariant"
        gap="300"
        alignItems="Center"
        {...props}
        ref={ref}
      >
        {before}
        <Box ref={canReorder ? targetRef : null} grow="Yes">
          {canReorder && <ItemDraggableTarget ref={targetHandleRef} />}
          {joined ? (
            <LocalRoomSummaryLoader roomId={roomId}>
              {(localSummary) => (
                <RoomProfile
                  roomId={roomId}
                  roomType={localSummary.roomType}
                  name={localSummary.name ?? 'Unknown'}
                  topic={localSummary.topic}
                  avatarUrl={
                    localSummary.avatarUrl
                      ? mxcToHttp(
                          ct.session.baseUrl,
                          localSummary.avatarUrl,
                          useAuthentication
                        ).thumbnail({
                          width: 96,
                          height: 96,
                          method: 'crop',
                        })
                      : undefined
                  }
                  memberCount={localSummary.memberCount}
                  suggested={content.suggested}
                  joinRule={localSummary.joinRule}
                  options={
                    joined ? (
                      <Box shrink="No" gap="100" alignItems="Center">
                        <Chip
                          data-room-id={roomId}
                          onClick={onOpen}
                          variant="Secondary"
                          fill="None"
                          size="400"
                          radii="Pill"
                          aria-label="Open Room"
                        >
                          <Icon size="50" src={Icons.ArrowRight} />
                        </Chip>
                      </Box>
                    ) : (
                      <RoomJoinButton roomId={roomId} via={content.via} />
                    )
                  }
                />
              )}
            </LocalRoomSummaryLoader>
          ) : (
            <>
              {!summary &&
                (error ? (
                  <RoomProfileError
                    roomId={roomId}
                    inaccessibleRoom={false}
                    suggested={content.suggested}
                    via={content.via}
                  />
                ) : (
                  <>
                    {loading && <RoomProfileLoading />}
                    {!loading && (
                      <RoomProfileError
                        roomId={roomId}
                        inaccessibleRoom
                        suggested={content.suggested}
                        via={content.via}
                      />
                    )}
                  </>
                ))}
              {summary && (
                <RoomProfile
                  roomId={roomId}
                  roomType={summary.room_type}
                  name={summary.name || summary.canonical_alias || roomId}
                  topic={summary.topic}
                  avatarUrl={
                    summary?.avatar_url
                      ? mxcToHttp(
                          ct.session.baseUrl,
                          summary.avatar_url,
                          useAuthentication
                        ).thumbnail({
                          width: 96,
                          height: 96,
                          method: 'crop',
                        })
                      : undefined
                  }
                  memberCount={summary.num_joined_members}
                  suggested={content.suggested}
                  joinRule={summary.join_rule as JoinRule}
                  options={<RoomJoinButton roomId={roomId} via={content.via} />}
                />
              )}
            </>
          )}
        </Box>
        {options}
        {after}
      </SequenceCard>
    );
  }
);
