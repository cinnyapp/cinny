import React, { forwardRef, MouseEventHandler, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { MatrixError, Room } from 'matrix-js-sdk';
import { IHierarchyRoom } from 'matrix-js-sdk/lib/@types/spaces';
import { Box, config, Text } from 'folds';
import {
  HierarchyItem,
  HierarchyItemRoom,
  HierarchyItemSpace,
  useFetchSpaceHierarchyLevel,
} from '../../hooks/useSpaceHierarchy';
import { IPowerLevels } from '../../hooks/usePowerLevels';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { SpaceItemCard } from './SpaceItem';
import { AfterItemDropTarget, CanDropCallback } from './DnD';
import { HierarchyItemMenu } from './HierarchyItemMenu';
import { RoomItemCard } from './RoomItem';
import { RoomType, StateEvent } from '../../../types/matrix/room';
import { SequenceCard } from '../../components/sequence-card';
import { getRoomCreatorsForRoomId } from '../../hooks/useRoomCreators';
import { getRoomPermissionsAPI } from '../../hooks/useRoomPermissions';

type SpaceHierarchyProps = {
  summary: IHierarchyRoom | undefined;
  spaceItem: HierarchyItemSpace;
  roomItems?: HierarchyItemRoom[];
  allJoinedRooms: Set<string>;
  mDirects: Set<string>;
  roomsPowerLevels: Map<string, IPowerLevels>;
  categoryId: string;
  closed: boolean;
  handleClose: MouseEventHandler<HTMLButtonElement>;
  draggingItem?: HierarchyItem;
  onDragging: (item?: HierarchyItem) => void;
  canDrop: CanDropCallback;
  disabledReorder?: boolean;
  nextSpaceId?: string;
  getRoom: (roomId: string) => Room | undefined;
  pinned: boolean;
  togglePinToSidebar: (roomId: string) => void;
  onSpacesFound: (spaceItems: IHierarchyRoom[]) => void;
  onOpenRoom: MouseEventHandler<HTMLButtonElement>;
};
export const SpaceHierarchy = forwardRef<HTMLDivElement, SpaceHierarchyProps>(
  (
    {
      summary,
      spaceItem,
      roomItems,
      allJoinedRooms,
      mDirects,
      roomsPowerLevels,
      categoryId,
      closed,
      handleClose,
      draggingItem,
      onDragging,
      canDrop,
      disabledReorder,
      nextSpaceId,
      getRoom,
      pinned,
      togglePinToSidebar,
      onOpenRoom,
      onSpacesFound,
    },
    ref
  ) => {
    const { t } = useTranslation();
    const mx = useMatrixClient();

    const { fetching, error, rooms } = useFetchSpaceHierarchyLevel(spaceItem.roomId, true);

    const subspaces = useMemo(() => {
      const s: Map<string, IHierarchyRoom> = new Map();
      rooms.forEach((r) => {
        if (r.room_type === RoomType.Space) {
          s.set(r.room_id, r);
        }
      });
      return s;
    }, [rooms]);

    const spacePowerLevels = roomsPowerLevels.get(spaceItem.roomId);
    const spaceCreators = getRoomCreatorsForRoomId(mx, spaceItem.roomId);
    const spacePermissions =
      spacePowerLevels && getRoomPermissionsAPI(spaceCreators, spacePowerLevels);

    const draggingSpace =
      draggingItem?.roomId === spaceItem.roomId && draggingItem.parentId === spaceItem.parentId;

    const { parentId } = spaceItem;
    const parentPowerLevels = parentId ? roomsPowerLevels.get(parentId) : undefined;
    const parentCreators = parentId ? getRoomCreatorsForRoomId(mx, parentId) : undefined;
    const parentPermissions =
      parentCreators &&
      parentPowerLevels &&
      getRoomPermissionsAPI(parentCreators, parentPowerLevels);

    useEffect(() => {
      onSpacesFound(Array.from(subspaces.values()));
    }, [subspaces, onSpacesFound]);

    let childItems = roomItems?.filter((i) => !subspaces.has(i.roomId));
    if (!spacePermissions?.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())) {
      // hide unknown rooms for normal user
      childItems = childItems?.filter((i) => {
        const forbidden = error instanceof MatrixError ? error.errcode === 'M_FORBIDDEN' : false;
        const inaccessibleRoom = !rooms.get(i.roomId) && !fetching && (error ? forbidden : true);
        return !inaccessibleRoom;
      });
    }

    return (
      <Box direction="Column" gap="100" ref={ref}>
        <SpaceItemCard
          summary={rooms.get(spaceItem.roomId) ?? summary}
          loading={fetching}
          item={spaceItem}
          joined={allJoinedRooms.has(spaceItem.roomId)}
          categoryId={categoryId}
          closed={closed}
          handleClose={handleClose}
          getRoom={getRoom}
          canEditChild={!!spacePermissions?.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())}
          canReorder={
            parentPowerLevels && !disabledReorder && parentPermissions
              ? parentPermissions.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())
              : false
          }
          options={
            parentId &&
            parentPowerLevels && (
              <HierarchyItemMenu
                item={{ ...spaceItem, parentId }}
                powerLevels={spacePowerLevels}
                joined={allJoinedRooms.has(spaceItem.roomId)}
                canEditChild={
                  !!parentPermissions?.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())
                }
                pinned={pinned}
                onTogglePin={togglePinToSidebar}
              />
            )
          }
          after={
            <AfterItemDropTarget
              item={spaceItem}
              nextRoomId={closed ? nextSpaceId : childItems?.[0]?.roomId}
              afterSpace
              canDrop={canDrop}
            />
          }
          onDragging={onDragging}
          data-dragging={draggingSpace}
        />
        {childItems && childItems.length > 0 ? (
          <Box direction="Column" gap="100">
            {childItems.map((roomItem, index) => {
              const roomSummary = rooms.get(roomItem.roomId);

              const roomPowerLevels = roomsPowerLevels.get(roomItem.roomId) ?? {};

              const lastItem = index === childItems.length;
              const nextRoomId = lastItem ? nextSpaceId : childItems[index + 1]?.roomId;

              const roomDragging =
                draggingItem?.roomId === roomItem.roomId &&
                draggingItem.parentId === roomItem.parentId;

              return (
                <RoomItemCard
                  key={roomItem.roomId}
                  item={roomItem}
                  loading={fetching}
                  error={error}
                  summary={roomSummary}
                  dm={mDirects.has(roomItem.roomId)}
                  onOpen={onOpenRoom}
                  getRoom={getRoom}
                  canReorder={
                    !!spacePermissions?.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId()) &&
                    !disabledReorder
                  }
                  options={
                    <HierarchyItemMenu
                      item={roomItem}
                      powerLevels={roomPowerLevels}
                      joined={allJoinedRooms.has(roomItem.roomId)}
                      canEditChild={
                        !!spacePermissions?.stateEvent(StateEvent.SpaceChild, mx.getSafeUserId())
                      }
                    />
                  }
                  after={
                    <AfterItemDropTarget
                      item={roomItem}
                      nextRoomId={nextRoomId}
                      canDrop={canDrop}
                    />
                  }
                  data-dragging={roomDragging}
                  onDragging={onDragging}
                />
              );
            })}
          </Box>
        ) : (
          childItems && (
            <SequenceCard variant="SurfaceVariant" gap="300" alignItems="Center">
              <Box
                grow="Yes"
                style={{
                  padding: config.space.S700,
                }}
                direction="Column"
                alignItems="Center"
                justifyContent="Center"
                gap="100"
              >
                <Text size="H5" align="Center">
                  {t('lobby.noRooms')}
                </Text>
                <Text align="Center" size="T300" priority="300">
                  {t('lobby.noRoomsDesc')}
                </Text>
              </Box>
            </SequenceCard>
          )
        )}
      </Box>
    );
  }
);
