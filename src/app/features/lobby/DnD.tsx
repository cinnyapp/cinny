import React, { RefObject, useEffect, useRef, useState } from 'react';
import {
  dropTargetForElements,
  draggable,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import classNames from 'classnames';
import { Box, Icon, Icons, as } from 'folds';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import * as css from './DnD.css';

export type DropContainerData = {
  item: HierarchyItem;
  nextRoomId?: string;
};
export type CanDropCallback = (item: HierarchyItem, container: DropContainerData) => boolean;

export const useDraggableItem = (
  item: HierarchyItem,
  targetRef: RefObject<HTMLElement>,
  onDragging: (item?: HierarchyItem) => void,
  dragHandleRef?: RefObject<HTMLElement>
): boolean => {
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const target = targetRef.current;
    const dragHandle = dragHandleRef?.current ?? undefined;

    return !target
      ? undefined
      : draggable({
          element: target,
          dragHandle,
          getInitialData: () => item,
          onDragStart: () => {
            setDragging(true);
            onDragging(item);
          },
          onDrop: () => {
            setDragging(false);
            onDragging(undefined);
          },
        });
  }, [targetRef, dragHandleRef, item, onDragging]);

  return dragging;
};

export const ItemDraggableTarget = as<'div'>(({ className, ...props }, ref) => (
  <Box
    justifyContent="Center"
    alignItems="Center"
    className={classNames(css.ItemDraggableTarget, className)}
    ref={ref}
    {...props}
  >
    <Icon size="50" src={Icons.VerticalDots} />
  </Box>
));

type AfterItemDropTargetProps = {
  item: HierarchyItem;
  afterSpace?: boolean;
  nextRoomId?: string;
  canDrop: CanDropCallback;
};
export function AfterItemDropTarget({
  item,
  afterSpace,
  nextRoomId,
  canDrop,
}: AfterItemDropTargetProps) {
  const targetRef = useRef<HTMLDivElement>(null);
  const [dropState, setDropState] = useState<'idle' | 'allow' | 'not-allow'>('idle');

  useEffect(() => {
    const target = targetRef.current;
    if (!target) {
      throw Error('drop target ref is not set properly');
    }

    return dropTargetForElements({
      element: target,
      getData: () => {
        const container: DropContainerData = {
          item,
          nextRoomId,
        };
        return container;
      },
      onDragEnter: ({ source }) => {
        if (
          canDrop(source.data as HierarchyItem, {
            item,
            nextRoomId,
          })
        ) {
          setDropState('allow');
        } else {
          setDropState('not-allow');
        }
      },
      onDragLeave: () => setDropState('idle'),
      onDrop: () => setDropState('idle'),
    });
  }, [item, nextRoomId, canDrop]);

  return (
    <div
      className={afterSpace ? css.AfterSpaceItemDropTarget : css.AfterRoomItemDropTarget}
      data-hover={dropState !== 'idle'}
      data-error={dropState === 'not-allow'}
      ref={targetRef}
    />
  );
}

export const useDnDMonitor = (
  scrollRef: RefObject<HTMLElement>,
  onDragging: (item?: HierarchyItem) => void,
  onReorder: (item: HierarchyItem, container: DropContainerData) => void
) => {
  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) {
      throw Error('Scroll element ref not configured');
    }

    return combine(
      monitorForElements({
        onDrop: ({ source, location }) => {
          onDragging(undefined);
          const { dropTargets } = location.current;
          if (dropTargets.length === 0) return;
          onReorder(source.data as HierarchyItem, dropTargets[0].data as DropContainerData);
        },
      }),
      autoScrollForElements({
        element: scrollElement,
      })
    );
  }, [scrollRef, onDragging, onReorder]);
};
