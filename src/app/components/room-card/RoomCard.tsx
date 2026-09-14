import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { MatrixError, Room, JoinRule } from 'matrix-js-sdk';
import {
  Avatar,
  Badge,
  Box,
  Button,
  Dialog,
  Icon,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  as,
  color,
  config,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import * as css from './style.css';
import { RoomAvatar } from '../room-avatar';
import { getMxIdLocalPart, mxcUrlToHttp } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { onEnterOrSpace, stopPropagation } from '../../utils/keyboard';
import { Membership, RoomType, StateEvent } from '../../../types/matrix/room';
import { useJoinedRoomId } from '../../hooks/useJoinedRoomId';
import { useElementSizeObserver } from '../../hooks/useElementSizeObserver';
import { getRoomAvatarUrl, getStateEvent } from '../../utils/room';
import { useStateEventCallback } from '../../hooks/useStateEventCallback';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';

type GridColumnCount = '1' | '2' | '3';
const getGridColumnCount = (gridWidth: number): GridColumnCount => {
  if (gridWidth <= 498) return '1';
  if (gridWidth <= 748) return '2';
  return '3';
};

const setGridColumnCount = (grid: HTMLElement, count: GridColumnCount): void => {
  grid.style.setProperty('grid-template-columns', `repeat(${count}, 1fr)`);
};

export function RoomCardGrid({ children }: { children: ReactNode }) {
  const gridRef = useRef<HTMLDivElement>(null);

  useElementSizeObserver(
    useCallback(() => gridRef.current, []),
    useCallback((width, _, target) => setGridColumnCount(target, getGridColumnCount(width)), [])
  );

  return (
    <Box className={css.CardGrid} direction="Row" gap="400" wrap="Wrap" ref={gridRef}>
      {children}
    </Box>
  );
}

export const RoomCardBase = as<'div'>(({ className, ...props }, ref) => (
  <Box
    direction="Column"
    gap="300"
    className={classNames(css.RoomCardBase, className)}
    {...props}
    ref={ref}
  />
));

export const RoomCardName = as<'h6'>(({ ...props }, ref) => (
  <Text as="h6" size="H6" truncate {...props} ref={ref} />
));

export const RoomCardTopic = as<'p'>(({ className, ...props }, ref) => (
  <Text
    as="p"
    size="T200"
    className={classNames(css.RoomCardTopic, className)}
    {...props}
    priority="400"
    ref={ref}
  />
));

function ErrorDialog({
  title,
  message,
  children,
}: {
  title: string;
  message: string;
  children: (openError: () => void) => ReactNode;
}) {
  const [viewError, setViewError] = useState(false);
  const closeError = () => setViewError(false);
  const openError = () => setViewError(true);

  return (
    <>
      {children(openError)}
      <Overlay open={viewError} backdrop={<OverlayBackdrop />}>
        <OverlayCenter>
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              clickOutsideDeactivates: true,
              onDeactivate: closeError,
              escapeDeactivates: stopPropagation,
            }}
          >
            <Dialog variant="Surface">
              <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
                <Box direction="Column" gap="100">
                  <Text>{title}</Text>
                  <Text style={{ color: color.Critical.Main }} size="T300" priority="400">
                    {message}
                  </Text>
                </Box>
                <Button size="400" variant="Secondary" fill="Soft" onClick={closeError}>
                  <Text size="B400">Cancel</Text>
                </Button>
              </Box>
            </Dialog>
          </FocusTrap>
        </OverlayCenter>
      </Overlay>
    </>
  );
}

const getNextJoinAction = (
  joinRule: string | undefined,
  membership: string | undefined
): 'join' | 'knock' | 'knock_waiting' | 'invite_only' => {
  switch (joinRule) {
    case JoinRule.Public:
      return 'join';
    case JoinRule.Invite:
      if (membership === Membership.Invite) {
        return 'join';
      } else {
        return 'invite_only';
      }
    case JoinRule.Private:
      return 'join';
    case JoinRule.Knock:
      if (membership === Membership.Knock) {
        return 'knock_waiting';
      } else if (membership === Membership.Invite) {
        return 'join';
      } else {
        return 'knock';
      }
    case JoinRule.Restricted:
      return 'join';
    case undefined:
      return 'invite_only';
    default:
      return 'join';
  }
};

const ActionError = ({
  action,
  title,
  message,
}: {
  action: () => void;
  title: string;
  message: string;
}) => {
  return (
    <Box gap="200">
      <Button
        onClick={action}
        className={css.ActionButton}
        variant="Critical"
        fill="Solid"
        size="300"
      >
        <Text size="B300" truncate>
          Retry
        </Text>
      </Button>
      <ErrorDialog title={title} message={message}>
        {(openError) => (
          <Button
            onClick={openError}
            className={css.ActionButton}
            variant="Critical"
            fill="Soft"
            outlined
            size="300"
          >
            <Text size="B300" truncate>
              View Error
            </Text>
          </Button>
        )}
      </ErrorDialog>
    </Box>
  );
};

type RoomCardProps = {
  roomIdOrAlias: string;
  allRooms: string[];
  avatarUrl?: string;
  name?: string;
  topic?: string;
  memberCount?: number;
  roomType?: string;
  joinRule?: string;
  membership?: string;
  viaServers?: string[];
  onView?: (roomId: string) => void;
  renderTopicViewer: (name: string, topic: string, requestClose: () => void) => ReactNode;
};

export const RoomCard = as<'div', RoomCardProps>(
  (
    {
      roomIdOrAlias,
      allRooms,
      avatarUrl,
      name,
      topic,
      memberCount,
      roomType,
      joinRule,
      membership,
      viaServers,
      onView,
      renderTopicViewer,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const joinedRoomId = useJoinedRoomId(allRooms, roomIdOrAlias);
    const joinedRoom = mx.getRoom(joinedRoomId);
    const [topicEvent, setTopicEvent] = useState(() =>
      joinedRoom ? getStateEvent(joinedRoom, StateEvent.RoomTopic) : undefined
    );

    const fallbackName = getMxIdLocalPart(roomIdOrAlias) ?? roomIdOrAlias;
    const fallbackTopic = roomIdOrAlias;

    const avatar = joinedRoom
      ? getRoomAvatarUrl(mx, joinedRoom, 96, useAuthentication)
      : avatarUrl && mxcUrlToHttp(mx, avatarUrl, useAuthentication, 96, 96, 'crop');

    const roomName = joinedRoom?.name || name || fallbackName;
    const roomTopic =
      (topicEvent?.getContent().topic as string) || undefined || topic || fallbackTopic;
    const joinedMemberCount = joinedRoom?.getJoinedMemberCount() ?? memberCount;

    useStateEventCallback(
      mx,
      useCallback(
        (event) => {
          if (
            joinedRoom &&
            event.getRoomId() === joinedRoom.roomId &&
            event.getType() === StateEvent.RoomTopic
          ) {
            setTopicEvent(getStateEvent(joinedRoom, StateEvent.RoomTopic));
          }
        },
        [joinedRoom]
      )
    );

    const action = getNextJoinAction(joinRule, membership);

    const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
      useCallback(() => mx.joinRoom(roomIdOrAlias, { viaServers }), [mx, roomIdOrAlias, viaServers])
    );
    const joining =
      joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

    const [knockState, knock] = useAsyncCallback<{ room_id: string }, MatrixError, []>(
      useCallback(
        () => mx.knockRoom(roomIdOrAlias, { viaServers }),
        [mx, roomIdOrAlias, viaServers]
      )
    );
    const knocking = knockState.status === AsyncStatus.Loading;
    const alreadyKnocked = knockState.status === AsyncStatus.Success || action === 'knock_waiting';

    const [viewTopic, setViewTopic] = useState(false);
    const closeTopic = () => setViewTopic(false);
    const openTopic = () => setViewTopic(true);

    return (
      <RoomCardBase {...props} ref={ref}>
        <Box gap="200" justifyContent="SpaceBetween">
          <Avatar size="500">
            <RoomAvatar
              roomId={roomIdOrAlias}
              src={avatar ?? undefined}
              alt={roomIdOrAlias}
              renderFallback={() => (
                <Text as="span" size="H3">
                  {nameInitials(roomName)}
                </Text>
              )}
            />
          </Avatar>
          {(roomType === RoomType.Space || joinedRoom?.isSpaceRoom()) && (
            <Badge variant="Secondary" fill="Soft" outlined>
              <Text size="L400">Space</Text>
            </Badge>
          )}
        </Box>
        <Box grow="Yes" direction="Column" gap="100">
          <RoomCardName>{roomName}</RoomCardName>
          <RoomCardTopic onClick={openTopic} onKeyDown={onEnterOrSpace(openTopic)} tabIndex={0}>
            {roomTopic}
          </RoomCardTopic>

          <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  clickOutsideDeactivates: true,
                  onDeactivate: closeTopic,
                  escapeDeactivates: stopPropagation,
                }}
              >
                {renderTopicViewer(roomName, roomTopic, closeTopic)}
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        </Box>
        {typeof joinedMemberCount === 'number' && (
          <Box gap="100">
            <Icon size="50" src={Icons.User} />
            <Text size="T200">{`${millify(joinedMemberCount)} Members`}</Text>
          </Box>
        )}
        {typeof joinedRoomId === 'string' && (
          <Button
            onClick={onView ? () => onView(joinedRoomId) : undefined}
            variant="Secondary"
            fill="Soft"
            size="300"
          >
            <Text size="B300" truncate>
              View
            </Text>
          </Button>
        )}
        {typeof joinedRoomId !== 'string' &&
          knockState.status !== AsyncStatus.Error &&
          (action === 'knock' || action === 'knock_waiting') && (
            <Button
              onClick={knock}
              variant="Secondary"
              size="300"
              disabled={knocking || alreadyKnocked}
              before={knocking && <Spinner size="50" variant="Secondary" fill="Soft" />}
            >
              <Text size="B300" truncate>
                {alreadyKnocked
                  ? 'Request Sent'
                  : knocking
                  ? 'Requesting Access'
                  : 'Request Access'}
              </Text>
            </Button>
          )}
        {typeof joinedRoomId !== 'string' &&
          joinState.status !== AsyncStatus.Error &&
          action === 'join' && (
            <Button
              onClick={join}
              variant="Secondary"
              size="300"
              disabled={joining}
              before={joining && <Spinner size="50" variant="Secondary" fill="Soft" />}
            >
              <Text size="B300" truncate>
                {joining ? 'Joining' : 'Join'}
              </Text>
            </Button>
          )}
        {typeof joinedRoomId !== 'string' &&
          action === 'join' &&
          joinState.status === AsyncStatus.Error && (
            <ActionError
              action={join}
              title={'Join Error'}
              message={joinState.error.message || 'Failed to join. Unknown Error.'}
            />
          )}
        {typeof joinedRoomId !== 'string' &&
          action === 'knock' &&
          knockState.status === AsyncStatus.Error && (
            <ActionError
              action={knock}
              title={'Join Request Error'}
              message={knockState.error.message || 'Failed to send request to join. Unknown Error.'}
            />
          )}
        {typeof joinedRoomId !== 'string' && action === 'invite_only' && (
          <Button disabled={true} variant="Secondary" size="300">
            <Text size="B300">Invite-only</Text>
          </Button>
        )}
      </RoomCardBase>
    );
  }
);
