import React, { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
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
import { getMxIdLocalPart } from '../../utils/matrix';
import { nameInitials } from '../../utils/common';
import { millify } from '../../plugins/millify';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { getResizeObserverEntry, useResizeObserver } from '../../hooks/useResizeObserver';
import { onEnterOrSpace } from '../../utils/keyboard';
import { RoomType } from '../../../types/matrix/room';

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

  useResizeObserver(
    useCallback((entries) => {
      const target = gridRef.current;
      if (!target) return;
      const targetEntry = getResizeObserverEntry(target, entries);
      if (targetEntry) {
        const columnCount = getGridColumnCount(targetEntry.contentRect.width);
        setGridColumnCount(target, columnCount);
      }
    }, []),
    useCallback(() => gridRef.current, [])
  );

  useEffect(() => {
    const target = gridRef.current;
    if (target) {
      setGridColumnCount(target, getGridColumnCount(target.clientWidth));
    }
  }, []);

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

type RoomCardProps = {
  roomIdOrAlias: string;
  joinedRoomId?: string;
  avatarUrl?: string;
  name?: string;
  topic?: string;
  memberCount?: number;
  roomType?: string;
  onView?: (roomId: string) => void;
  renderTopicViewer: (name: string, topic: string, requestClose: () => void) => ReactNode;
};

export const RoomCard = as<'div', RoomCardProps>(
  (
    {
      roomIdOrAlias,
      joinedRoomId,
      avatarUrl,
      name,
      topic,
      memberCount,
      roomType,
      onView,
      renderTopicViewer,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const avatar = avatarUrl && mx.mxcUrlToHttp(avatarUrl, 96, 96, 'crop');
    const fallbackName = getMxIdLocalPart(roomIdOrAlias) ?? roomIdOrAlias;
    const fallbackTopic = roomIdOrAlias;

    const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
      useCallback(() => mx.joinRoom(roomIdOrAlias), [mx, roomIdOrAlias])
    );
    const joining =
      joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;

    const [viewTopic, setViewTopic] = useState(false);
    const closeTopic = () => setViewTopic(false);
    const openTopic = () => setViewTopic(true);

    return (
      <RoomCardBase {...props} ref={ref}>
        <Box gap="200" justifyContent="SpaceBetween">
          <Avatar size="500">
            <RoomAvatar
              src={avatar ?? undefined}
              alt={roomIdOrAlias}
              renderInitials={() => (
                <Text as="span" size="H3">
                  {nameInitials(name || fallbackName)}
                </Text>
              )}
            />
          </Avatar>
          {roomType === RoomType.Space && (
            <Badge variant="Secondary" fill="Soft" outlined>
              <Text size="L400">Space</Text>
            </Badge>
          )}
        </Box>
        <Box grow="Yes" direction="Column" gap="100">
          <RoomCardName>{name || fallbackName}</RoomCardName>
          <RoomCardTopic onClick={openTopic} onKeyDown={onEnterOrSpace(openTopic)} tabIndex={0}>
            {topic || fallbackTopic}
          </RoomCardTopic>

          <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  clickOutsideDeactivates: true,
                  onDeactivate: closeTopic,
                }}
              >
                {renderTopicViewer(name || fallbackName, topic || fallbackTopic, closeTopic)}
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        </Box>
        {typeof memberCount === 'number' && (
          <Box gap="100">
            <Icon size="50" src={Icons.User} />
            <Text size="T200">{`${millify(memberCount)} Members`}</Text>
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
        {typeof joinedRoomId !== 'string' && joinState.status !== AsyncStatus.Error && (
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
        {typeof joinedRoomId !== 'string' && joinState.status === AsyncStatus.Error && (
          <Box gap="200">
            <Button
              onClick={join}
              className={css.ActionButton}
              variant="Critical"
              fill="Solid"
              size="300"
            >
              <Text size="B300" truncate>
                Retry
              </Text>
            </Button>
            <ErrorDialog
              title="Join Error"
              message={joinState.error.message || 'Failed to join. Unknown Error.'}
            >
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
        )}
      </RoomCardBase>
    );
  }
);
