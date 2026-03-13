import React, { MouseEventHandler, ReactNode, useCallback, useRef, useState } from 'react';
import {
  Box,
  Avatar,
  Text,
  Chip,
  Icon,
  Icons,
  as,
  Badge,
  toRem,
  Spinner,
  PopOut,
  Menu,
  MenuItem,
  RectCords,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import classNames from 'classnames';
import { MatrixError, Room } from 'matrix-js-sdk';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import { LocalRoomSummaryLoader } from '../../components/RoomSummaryLoader';
import { getRoomAvatarUrl } from '../../utils/room';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import * as css from './SpaceItem.css';
import * as styleCss from './style.css';
import { useDraggableItem } from './DnD';
import { stopPropagation } from '../../utils/keyboard';
import { mxcUrlToHttp } from '../../utils/matrix';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenCreateRoomModal } from '../../state/hooks/createRoomModal';
import { useOpenCreateSpaceModal } from '../../state/hooks/createSpaceModal';
import { AddExistingModal } from '../add-existing';
import { CreateRoomType } from '../../components/create-room/types';
import { BetaNoticeBadge } from '../../components/BetaNoticeBadge';

function SpaceProfileLoading() {
  return (
    <Box gap="200" alignItems="Center">
      <Box grow="Yes" gap="200" alignItems="Center" className={css.HeaderChipPlaceholder}>
        <Avatar className={styleCss.AvatarPlaceholder} size="200" radii="300" />
        <Box
          className={styleCss.LinePlaceholder}
          shrink="No"
          style={{ width: '100vw', maxWidth: toRem(120) }}
        />
      </Box>
    </Box>
  );
}

type InaccessibleSpaceProfileProps = {
  roomId: string;
  suggested?: boolean;
};
function InaccessibleSpaceProfile({ roomId, suggested }: InaccessibleSpaceProfileProps) {
  return (
    <Chip
      as="span"
      className={css.HeaderChip}
      variant="Surface"
      size="500"
      before={
        <Avatar size="200" radii="300">
          <RoomAvatar
            roomId={roomId}
            renderFallback={() => (
              <Text as="span" size="H6">
                U
              </Text>
            )}
          />
        </Avatar>
      }
    >
      <Box alignItems="Center" gap="200">
        <Text size="H4" truncate>
          Unknown
        </Text>

        <Badge variant="Secondary" fill="Soft" radii="Pill" outlined>
          <Text size="L400">Inaccessible</Text>
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

type UnjoinedSpaceProfileProps = {
  roomId: string;
  via?: string[];
  name?: string;
  avatarUrl?: string;
  suggested?: boolean;
};
function UnjoinedSpaceProfile({
  roomId,
  via,
  name,
  avatarUrl,
  suggested,
}: UnjoinedSpaceProfileProps) {
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
            roomId={roomId}
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
  roomId: string;
  name: string;
  avatarUrl?: string;
  suggested?: boolean;
  closed: boolean;
  categoryId: string;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function SpaceProfile({
  roomId,
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
            roomId={roomId}
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

type RootSpaceProfileProps = {
  closed: boolean;
  categoryId: string;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
};
function RootSpaceProfile({ closed, categoryId, handleClose }: RootSpaceProfileProps) {
  return (
    <Chip
      data-category-id={categoryId}
      onClick={handleClose}
      className={css.HeaderChip}
      variant="Surface"
      size="500"
      after={<Icon src={closed ? Icons.ChevronRight : Icons.ChevronBottom} size="50" />}
    >
      <Box alignItems="Center" gap="200">
        <Text size="H4" truncate>
          Rooms
        </Text>
      </Box>
    </Chip>
  );
}

function AddRoomButton({ item }: { item: HierarchyItem }) {
  const [cords, setCords] = useState<RectCords>();
  const openCreateRoomModal = useOpenCreateRoomModal();
  const [addExisting, setAddExisting] = useState(false);

  const handleAddRoom: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleCreateRoom = (type?: CreateRoomType) => {
    openCreateRoomModal(item.roomId, type);
    setCords(undefined);
  };

  const handleAddExisting = () => {
    setAddExisting(true);
    setCords(undefined);
  };

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setCords(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ padding: config.space.S100 }}>
            <MenuItem
              size="300"
              radii="300"
              variant="Primary"
              fill="None"
              onClick={() => handleCreateRoom(CreateRoomType.TextRoom)}
            >
              <Text size="T300">Chat Room</Text>
            </MenuItem>
            <MenuItem
              size="300"
              radii="300"
              variant="Primary"
              fill="None"
              onClick={() => handleCreateRoom(CreateRoomType.VoiceRoom)}
              after={<BetaNoticeBadge />}
            >
              <Text size="T300">Voice Room</Text>
            </MenuItem>
            <MenuItem size="300" radii="300" fill="None" onClick={handleAddExisting}>
              <Text size="T300">Existing Room</Text>
            </MenuItem>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant="Primary"
        radii="Pill"
        before={<Icon src={Icons.Plus} size="50" />}
        onClick={handleAddRoom}
        aria-pressed={!!cords}
      >
        <Text size="B300">Add Room</Text>
      </Chip>
      {addExisting && (
        <AddExistingModal parentId={item.roomId} requestClose={() => setAddExisting(false)} />
      )}
    </PopOut>
  );
}

function AddSpaceButton({ item }: { item: HierarchyItem }) {
  const [cords, setCords] = useState<RectCords>();
  const openCreateSpaceModal = useOpenCreateSpaceModal();
  const [addExisting, setAddExisting] = useState(false);

  const handleAddSpace: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleCreateSpace = () => {
    openCreateSpaceModal(item.roomId as any);
    setCords(undefined);
  };

  const handleAddExisting = () => {
    setAddExisting(true);
    setCords(undefined);
  };
  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setCords(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ padding: config.space.S100 }}>
            <MenuItem
              size="300"
              radii="300"
              variant="Primary"
              fill="None"
              onClick={handleCreateSpace}
            >
              <Text size="T300">New Space</Text>
            </MenuItem>
            <MenuItem size="300" radii="300" fill="None" onClick={handleAddExisting}>
              <Text size="T300">Existing Space</Text>
            </MenuItem>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant="SurfaceVariant"
        radii="Pill"
        before={<Icon src={Icons.Plus} size="50" />}
        onClick={handleAddSpace}
        aria-pressed={!!cords}
      >
        <Text size="B300">Add Space</Text>
      </Chip>
      {addExisting && (
        <AddExistingModal space parentId={item.roomId} requestClose={() => setAddExisting(false)} />
      )}
    </PopOut>
  );
}

type SpaceItemCardProps = {
  summary: IHierarchyRoom | undefined;
  loading?: boolean;
  item: HierarchyItem;
  joined?: boolean;
  categoryId: string;
  closed: boolean;
  handleClose?: MouseEventHandler<HTMLButtonElement>;
  options?: ReactNode;
  before?: ReactNode;
  after?: ReactNode;
  canEditChild: boolean;
  canReorder: boolean;
  onDragging: (item?: HierarchyItem) => void;
  getRoom: (roomId: string) => Room | undefined;
};
export const SpaceItemCard = as<'div', SpaceItemCardProps>(
  (
    {
      className,
      summary,
      loading,
      joined,
      closed,
      categoryId,
      item,
      handleClose,
      options,
      before,
      after,
      canEditChild,
      canReorder,
      onDragging,
      getRoom,
      ...props
    },
    ref
  ) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const { roomId, content } = item;
    const space = getRoom(roomId);
    const targetRef = useRef<HTMLDivElement>(null);
    useDraggableItem(item, targetRef, onDragging);

    return (
      <Box
        shrink="No"
        alignItems="Center"
        gap="200"
        className={classNames(css.SpaceItemCard({ outlined: !joined || closed }), className)}
        {...props}
        ref={ref}
      >
        {before}
        <Box grow="Yes" gap="100" alignItems="Inherit" justifyContent="SpaceBetween">
          <Box ref={canReorder ? targetRef : null}>
            {space ? (
              <LocalRoomSummaryLoader room={space}>
                {(localSummary) =>
                  item.parentId ? (
                    <SpaceProfile
                      roomId={roomId}
                      name={localSummary.name}
                      avatarUrl={getRoomAvatarUrl(mx, space, 96, useAuthentication)}
                      suggested={content.suggested}
                      closed={closed}
                      categoryId={categoryId}
                      handleClose={handleClose}
                    />
                  ) : (
                    <RootSpaceProfile
                      closed={closed}
                      categoryId={categoryId}
                      handleClose={handleClose}
                    />
                  )
                }
              </LocalRoomSummaryLoader>
            ) : (
              <>
                {!summary &&
                  (loading ? (
                    <SpaceProfileLoading />
                  ) : (
                    <InaccessibleSpaceProfile
                      roomId={item.roomId}
                      suggested={item.content.suggested}
                    />
                  ))}
                {summary && (
                  <UnjoinedSpaceProfile
                    roomId={roomId}
                    via={item.content.via}
                    name={summary.name || summary.canonical_alias || roomId}
                    avatarUrl={
                      summary?.avatar_url
                        ? mxcUrlToHttp(mx, summary.avatar_url, useAuthentication, 96, 96, 'crop') ??
                          undefined
                        : undefined
                    }
                    suggested={content.suggested}
                  />
                )}
              </>
            )}
          </Box>
          {space && canEditChild && (
            <Box shrink="No" alignItems="Inherit" gap="200">
              <AddRoomButton item={item} />
              {item.parentId === undefined && <AddSpaceButton item={item} />}
            </Box>
          )}
        </Box>
        {options}
        {after}
      </Box>
    );
  }
);
