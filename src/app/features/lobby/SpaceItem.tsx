import React, { MouseEventHandler, useCallback } from 'react';
import { Box, Avatar, Text, Chip, Icon, Icons, as, Badge, toRem, Spinner } from 'folds';
import classNames from 'classnames';
import { MatrixError, Room } from 'matrix-js-sdk';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import {
  HierarchyRoomSummaryLoader,
  LocalRoomSummaryLoader,
} from '../../components/RoomSummaryLoader';
import { getRoomAvatarUrl } from '../../utils/room';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import * as css from './SpaceItem.css';
import * as styleCss from './style.css';
import { ErrorCode } from '../../cs-errorcode';

function SpaceProfileLoading() {
  return (
    <Box grow="Yes" gap="200" alignItems="Center">
      <Box grow="Yes" gap="200" alignItems="Center" className={css.HeaderChipPlaceholder}>
        <Avatar className={styleCss.AvatarPlaceholder} size="200" radii="300" />
        <Box className={styleCss.LinePlaceholder} shrink="No" style={{ maxWidth: toRem(120) }} />
      </Box>
    </Box>
  );
}

type UnknownPrivateSpaceProfileProps = {
  name?: string;
  avatarUrl?: string;
  suggested?: boolean;
};
function UnknownPrivateSpaceProfile({
  name,
  avatarUrl,
  suggested,
}: UnknownPrivateSpaceProfileProps) {
  return (
    <Chip
      as="span"
      className={css.HeaderChip}
      variant="Surface"
      size="500"
      before={
        <Avatar size="200" radii="300">
          <RoomAvatar
            src={avatarUrl}
            alt={name}
            renderFallback={() => (
              <Text as="span" size="H6">
                {nameInitials(name)}
              </Text>
            )}
          />
        </Avatar>
      }
    >
      <Box alignItems="Center" gap="200">
        <Text size="H4" truncate>
          {name || 'Unknown'}
        </Text>

        <Badge variant="Secondary" fill="Soft" radii="Pill" outlined>
          <Text size="L400">Private Space</Text>
        </Badge>
        {suggested && (
          <Badge variant="Success" fill="Soft" radii="Pill" outlined>
            <Text size="L400">Suggested</Text>
          </Badge>
        )}
      </Box>
    </Chip>
  );
}

type UnknownSpaceProfileProps = {
  roomId: string;
  via?: string[];
  name?: string;
  avatarUrl?: string;
  suggested?: boolean;
};
function UnknownSpaceProfile({
  roomId,
  via,
  name,
  avatarUrl,
  suggested,
}: UnknownSpaceProfileProps) {
  const mx = useMatrixClient();

  const [joinState, join] = useAsyncCallback<Room, MatrixError, []>(
    useCallback(() => mx.joinRoom(roomId, { viaServers: via }), [mx, roomId, via])
  );

  const canJoin = joinState.status === AsyncStatus.Idle || joinState.status === AsyncStatus.Error;
  return (
    <Chip
      className={css.HeaderChip}
      variant="Surface"
      size="500"
      onClick={join}
      disabled={!canJoin}
      before={
        <Avatar size="200" radii="300">
          <RoomAvatar
            src={avatarUrl}
            alt={name}
            renderFallback={() => (
              <Text as="span" size="H6">
                {nameInitials(name)}
              </Text>
            )}
          />
        </Avatar>
      }
      after={
        canJoin ? <Icon src={Icons.Plus} size="50" /> : <Spinner variant="Secondary" size="200" />
      }
    >
      <Box alignItems="Center" gap="200">
        <Text size="H4" truncate>
          {name || 'Unknown'}
        </Text>
        {suggested && (
          <Badge variant="Success" fill="Soft" radii="Pill" outlined>
            <Text size="L400">Suggested</Text>
          </Badge>
        )}
        {joinState.status === AsyncStatus.Error && (
          <Badge variant="Critical" fill="Soft" radii="Pill" outlined>
            <Text size="L400" truncate>
              {joinState.error.name}
            </Text>
          </Badge>
        )}
      </Box>
    </Chip>
  );
}

type SpaceProfileProps = {
  name: string;
  avatarUrl?: string;
  suggested?: boolean;
  closed: boolean;
  categoryId: string;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function SpaceProfile({
  name,
  avatarUrl,
  suggested,
  closed,
  categoryId,
  handleClose,
}: SpaceProfileProps) {
  return (
    <Chip
      data-category-id={categoryId}
      onClick={handleClose}
      className={css.HeaderChip}
      variant="Surface"
      size="500"
      before={
        <Avatar size="200" radii="300">
          <RoomAvatar
            src={avatarUrl}
            alt={name}
            renderFallback={() => (
              <Text as="span" size="H6">
                {nameInitials(name)}
              </Text>
            )}
          />
        </Avatar>
      }
      after={<Icon src={closed ? Icons.ChevronRight : Icons.ChevronBottom} size="50" />}
    >
      <Box alignItems="Center" gap="200">
        <Text size="H4" truncate>
          {name}
        </Text>
        {suggested && (
          <Badge variant="Success" fill="Soft" radii="Pill" outlined>
            <Text size="L400">Suggested</Text>
          </Badge>
        )}
      </Box>
    </Chip>
  );
}

type SpaceItemCardProps = {
  item: HierarchyItem;
  joined?: boolean;
  categoryId: string;
  closed: boolean;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
export const SpaceItemCard = as<'div', SpaceItemCardProps>(
  ({ className, joined, closed, categoryId, item, handleClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const { roomId, content } = item;
    const space = mx.getRoom(roomId);

    return (
      <Box
        shrink="No"
        className={classNames(css.SpaceItemCard({ outlined: !joined || closed }), className)}
        {...props}
        ref={ref}
      >
        {space ? (
          <LocalRoomSummaryLoader room={space}>
            {(localSummary) => (
              <SpaceProfile
                name={localSummary.name}
                avatarUrl={getRoomAvatarUrl(mx, space, 96)}
                suggested={content.suggested}
                closed={closed}
                categoryId={categoryId}
                handleClose={handleClose}
              />
            )}
          </LocalRoomSummaryLoader>
        ) : (
          <HierarchyRoomSummaryLoader roomId={roomId}>
            {(summaryState) => (
              <>
                {summaryState.status === AsyncStatus.Loading && <SpaceProfileLoading />}
                {summaryState.status === AsyncStatus.Error &&
                  (summaryState.error.name === ErrorCode.M_FORBIDDEN ? (
                    <UnknownPrivateSpaceProfile suggested={content.suggested} />
                  ) : (
                    <UnknownSpaceProfile
                      roomId={roomId}
                      via={item.content.via}
                      suggested={content.suggested}
                    />
                  ))}
                {summaryState.status === AsyncStatus.Success && (
                  <UnknownSpaceProfile
                    roomId={roomId}
                    via={item.content.via}
                    name={summaryState.data.name || roomId}
                    avatarUrl={
                      summaryState.data?.avatar_url
                        ? mx.mxcUrlToHttp(summaryState.data.avatar_url, 96, 96, 'crop') ?? undefined
                        : undefined
                    }
                    suggested={content.suggested}
                  />
                )}
              </>
            )}
          </HierarchyRoomSummaryLoader>
        )}
        <Box shrink="No">
          {/* <Chip variant="Primary" radii="Pill" before={<Icon size="100" src={Icons.CheckTwice} />}>
          <Text size="T200">Some</Text>
        </Chip> */}
        </Box>
      </Box>
    );
  }
);
