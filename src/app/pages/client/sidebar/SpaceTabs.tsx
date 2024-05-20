import React, {
  MouseEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, IconButton, Icons, Text } from 'folds';
import { useAtom, useAtomValue } from 'jotai';
import { Room } from 'matrix-js-sdk';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import {
  attachInstruction,
  extractInstruction,
  Instruction,
} from '@atlaskit/pragmatic-drag-and-drop-hitbox/tree-item';
import { autoScrollForElements } from '@atlaskit/pragmatic-drag-and-drop-auto-scroll/element';
import { combine } from '@atlaskit/pragmatic-drag-and-drop/combine';
import { useOrphanSpaces } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { getSpaceLobbyPath, joinPathComponent } from '../../pathUtils';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
  SidebarStack,
  SidebarStackSeparator,
  SidebarFolder,
  SidebarFolderDropTarget,
} from '../../../components/sidebar';
import { RoomUnreadProvider, RoomsUnreadProvider } from '../../../components/RoomUnreadProvider';
import { useSelectedSpace } from '../../../hooks/router/useSelectedSpace';
import { navToActivePathAtom } from '../../../state/navToActivePath';
import { UnreadBadge } from '../../../components/unread-badge';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';
import { RoomAvatar } from '../../../components/room-avatar';
import { nameInitials, randomStr } from '../../../utils/common';
import {
  ISidebarFolder,
  InCinnySpacesContent,
  SidebarItems,
  TSidebarItem,
  parseSidebar,
  useSidebarItems,
} from '../../../hooks/useSidebarItems';
import { openedSidebarFolderAtom } from '../../../state/openedSidebarFolder';
import { AccountDataEvent } from '../../../../types/matrix/accountData';
import { getAccountData } from '../../../utils/room';

type InstructionType = Instruction['type'];
type FolderDraggable = {
  folder: ISidebarFolder;
  spaceId?: string;
  open?: boolean;
};
type SidebarDraggable = string | FolderDraggable;

const useDraggableItem = (
  item: SidebarDraggable,
  targetRef: RefObject<HTMLElement>,
  onDragging: (item?: SidebarDraggable) => void,
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
          getInitialData: () => ({ item }),
          onDragStart: () => {
            setDragging(true);
            onDragging?.(item);
          },
          onDrop: () => {
            setDragging(false);
            onDragging?.(undefined);
          },
        });
  }, [targetRef, dragHandleRef, item, onDragging]);

  return dragging;
};

const useDropTarget = (
  item: SidebarDraggable,
  targetRef: RefObject<HTMLElement>
): Instruction | undefined => {
  const [dropState, setDropState] = useState<Instruction>();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as SidebarDraggable;
        return dragItem !== item;
      },
      getData: ({ input, element }) => {
        const block: Instruction['type'][] = ['reparent'];
        if (typeof item === 'object' && item.spaceId) block.push('make-child');

        const insData = attachInstruction(
          {},
          {
            input,
            element,
            currentLevel: 0,
            indentPerLevel: 0,
            mode: 'standard',
            block,
          }
        );

        const instruction: Instruction | null = extractInstruction(insData);
        setDropState(instruction ?? undefined);

        return {
          item,
          instructionType: instruction ? instruction.type : undefined,
        };
      },
      onDragLeave: () => setDropState(undefined),
      onDrop: () => setDropState(undefined),
    });
  }, [item, targetRef]);

  return dropState;
};

function useDropTargetInstruction<T extends InstructionType>(
  item: SidebarDraggable,
  targetRef: RefObject<HTMLElement>,
  instructionType: T
): T | undefined {
  const [dropState, setDropState] = useState<T>();

  useEffect(() => {
    const target = targetRef.current;
    if (!target) return undefined;

    return dropTargetForElements({
      element: target,
      canDrop: ({ source }) => {
        const dragItem = source.data.item as SidebarDraggable;
        return dragItem !== item;
      },
      getData: () => {
        setDropState(instructionType);

        return {
          item,
          instructionType,
        };
      },
      onDragLeave: () => setDropState(undefined),
      onDrop: () => setDropState(undefined),
    });
  }, [item, targetRef, instructionType]);

  return dropState;
}

const useDnDMonitor = (
  scrollRef: RefObject<HTMLElement>,
  onDragging: (dragItem?: SidebarDraggable) => void,
  onReorder: (
    draggable: SidebarDraggable,
    container: SidebarDraggable,
    instruction: InstructionType
  ) => void
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
          const item = source.data.item as SidebarDraggable;
          const containerItem = dropTargets[0].data.item as SidebarDraggable;
          const instructionType = dropTargets[0].data.instructionType as
            | InstructionType
            | undefined;
          if (!instructionType) return;
          onReorder(item, containerItem, instructionType);
        },
      }),
      autoScrollForElements({
        element: scrollElement,
      })
    );
  }, [scrollRef, onDragging, onReorder]);
};

type SpaceTabProps = {
  space: Room;
  selected: boolean;
  onClick: MouseEventHandler<HTMLButtonElement>;
  folder?: ISidebarFolder;
  onDragging: (dragItem?: SidebarDraggable) => void;
  disabled?: boolean;
};
function SpaceTab({ space, selected, onClick, folder, onDragging, disabled }: SpaceTabProps) {
  const mx = useMatrixClient();
  const targetRef = useRef<HTMLDivElement>(null);

  const spaceDraggable: SidebarDraggable = useMemo(
    () =>
      folder
        ? {
            folder,
            spaceId: space.roomId,
          }
        : space.roomId,
    [folder, space]
  );

  useDraggableItem(spaceDraggable, targetRef, onDragging);
  const dropState = useDropTarget(spaceDraggable, targetRef);
  const dropType = dropState?.type;

  return (
    <RoomUnreadProvider roomId={space.roomId}>
      {(unread) => (
        <SidebarItem
          active={selected}
          ref={targetRef}
          aria-disabled={disabled}
          data-drop-child={dropType === 'make-child'}
          data-drop-above={dropType === 'reorder-above'}
          data-drop-below={dropType === 'reorder-below'}
          data-inside-folder={!!folder}
        >
          <SidebarItemTooltip tooltip={disabled ? undefined : space.name}>
            {(triggerRef) => (
              <SidebarAvatar
                as="button"
                data-id={space.roomId}
                ref={triggerRef}
                size={folder ? '300' : '400'}
                onClick={onClick}
              >
                <RoomAvatar
                  src={space.getAvatarUrl(mx.baseUrl, 96, 96, 'crop') ?? undefined}
                  alt={space.name}
                  renderFallback={() => (
                    <Text size={folder ? 'H6' : 'H4'}>{nameInitials(space.name)}</Text>
                  )}
                />
              </SidebarAvatar>
            )}
          </SidebarItemTooltip>
          {unread && (
            <SidebarItemBadge hasCount={unread.total > 0}>
              <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
            </SidebarItemBadge>
          )}
        </SidebarItem>
      )}
    </RoomUnreadProvider>
  );
}

type OpenedSpaceFolderProps = {
  folder: ISidebarFolder;
  onClose: MouseEventHandler<HTMLButtonElement>;
  children?: ReactNode;
};
function OpenedSpaceFolder({ folder, onClose, children }: OpenedSpaceFolderProps) {
  const aboveTargetRef = useRef<HTMLDivElement>(null);
  const belowTargetRef = useRef<HTMLDivElement>(null);

  const spaceDraggable: SidebarDraggable = useMemo(() => ({ folder, open: true }), [folder]);

  const orderAbove = useDropTargetInstruction(spaceDraggable, aboveTargetRef, 'reorder-above');
  const orderBelow = useDropTargetInstruction(spaceDraggable, belowTargetRef, 'reorder-below');

  return (
    <SidebarFolder
      state="Open"
      data-drop-above={orderAbove === 'reorder-above'}
      data-drop-below={orderBelow === 'reorder-below'}
    >
      <SidebarFolderDropTarget ref={aboveTargetRef} position="Top" />
      <SidebarAvatar size="300">
        <IconButton data-id={folder.id} size="300" variant="Background" onClick={onClose}>
          <Icon size="400" src={Icons.ChevronTop} filled />
        </IconButton>
      </SidebarAvatar>
      {children}
      <SidebarFolderDropTarget ref={belowTargetRef} position="Bottom" />
    </SidebarFolder>
  );
}

type ClosedSpaceFolderProps = {
  folder: ISidebarFolder;
  selected: boolean;
  onOpen: MouseEventHandler<HTMLButtonElement>;
  onDragging: (dragItem?: SidebarDraggable) => void;
  disabled?: boolean;
};
function ClosedSpaceFolder({
  folder,
  selected,
  onOpen,
  onDragging,
  disabled,
}: ClosedSpaceFolderProps) {
  const mx = useMatrixClient();
  const handlerRef = useRef<HTMLDivElement>(null);

  const spaceDraggable: FolderDraggable = useMemo(() => ({ folder }), [folder]);
  useDraggableItem(spaceDraggable, handlerRef, onDragging);
  const dropState = useDropTarget(spaceDraggable, handlerRef);
  const dropType = dropState?.type;

  const tooltipName =
    folder.name ?? folder.content.map((i) => mx.getRoom(i)?.name ?? '').join(', ') ?? 'Unnamed';

  return (
    <RoomsUnreadProvider rooms={folder.content}>
      {(unread) => (
        <SidebarItem
          active={selected}
          ref={handlerRef}
          aria-disabled={disabled}
          data-drop-child={dropType === 'make-child'}
          data-drop-above={dropType === 'reorder-above'}
          data-drop-below={dropType === 'reorder-below'}
        >
          <SidebarItemTooltip tooltip={disabled ? undefined : tooltipName}>
            {(tooltipRef) => (
              <SidebarFolder data-id={folder.id} as="button" ref={tooltipRef} onClick={onOpen}>
                {folder.content.map((sId) => {
                  const space = mx.getRoom(sId);
                  if (!space) return null;

                  return (
                    <SidebarAvatar key={sId} size="200" radii="300">
                      <RoomAvatar
                        src={space.getAvatarUrl(mx.baseUrl, 96, 96, 'crop') ?? undefined}
                        alt={space.name}
                        renderFallback={() => <Text size="T200">{nameInitials(space.name)}</Text>}
                      />
                    </SidebarAvatar>
                  );
                })}
              </SidebarFolder>
            )}
          </SidebarItemTooltip>
          {unread && (
            <SidebarItemBadge hasCount={unread.total > 0}>
              <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
            </SidebarItemBadge>
          )}
        </SidebarItem>
      )}
    </RoomsUnreadProvider>
  );
}

type SpaceTabsProps = {
  scrollRef: RefObject<HTMLDivElement>;
};
export function SpaceTabs({ scrollRef }: SpaceTabsProps) {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const [sidebarItems, localEchoSidebarItem] = useSidebarItems(orphanSpaces);
  const navToActivePath = useAtomValue(navToActivePathAtom);
  const [openedFolder, setOpenedFolder] = useAtom(openedSidebarFolderAtom);
  const [draggingItem, setDraggingItem] = useState<SidebarDraggable>();

  useDnDMonitor(
    scrollRef,
    setDraggingItem,
    useCallback(
      (item, containerItem, instructionType) => {
        const newItems: SidebarItems = [];

        const matchDest = (sI: TSidebarItem, dI: SidebarDraggable): boolean => {
          if (typeof sI === 'string' && typeof dI === 'string') {
            return sI === dI;
          }
          if (typeof sI === 'object' && typeof dI === 'object') {
            return sI.id === dI.folder.id;
          }
          return false;
        };
        const itemAsFolderContent = (i: SidebarDraggable): string[] => {
          if (typeof i === 'string') {
            return [i];
          }
          if (i.spaceId) {
            return [i.spaceId];
          }
          return [...i.folder.content];
        };

        sidebarItems.forEach((i) => {
          const sameFolders =
            typeof item === 'object' &&
            typeof containerItem === 'object' &&
            item.folder.id === containerItem.folder.id;

          // remove draggable space from current position or folder
          if (!sameFolders && matchDest(i, item)) {
            if (typeof item === 'object' && item.spaceId) {
              const folderContent = item.folder.content.filter((s) => s !== item.spaceId);
              if (folderContent.length === 0) {
                // remove open state from local storage
                setOpenedFolder({ type: 'DELETE', id: item.folder.id });
                return;
              }
              newItems.push({
                ...item.folder,
                content: folderContent,
              });
            }
            return;
          }
          if (matchDest(i, containerItem)) {
            // we can make child only if
            // container item is space or closed folder
            if (instructionType === 'make-child') {
              const child: string[] = itemAsFolderContent(item);
              if (typeof containerItem === 'string') {
                const folder: ISidebarFolder = {
                  id: randomStr(),
                  content: [containerItem].concat(child),
                };
                newItems.push(folder);
                return;
              }
              newItems.push({
                ...containerItem.folder,
                content: containerItem.folder.content.concat(child),
              });
              return;
            }

            // drop inside opened folder
            // or reordering inside same folder
            if (typeof containerItem === 'object' && containerItem.spaceId) {
              const child = itemAsFolderContent(item);
              const newContent: string[] = [];
              containerItem.folder.content
                .filter((sId) => !child.includes(sId))
                .forEach((sId) => {
                  if (sId === containerItem.spaceId) {
                    if (instructionType === 'reorder-below') {
                      newContent.push(sId, ...child);
                    }
                    if (instructionType === 'reorder-above') {
                      newContent.push(...child, sId);
                    }
                    return;
                  }
                  newContent.push(sId);
                });
              const folder = {
                ...containerItem.folder,
                content: newContent,
              };

              newItems.push(folder);
              return;
            }

            // drop above or below space or closed/opened folder
            if (typeof item === 'string') {
              if (instructionType === 'reorder-below') newItems.push(i);
              newItems.push(item);
              if (instructionType === 'reorder-above') newItems.push(i);
            } else if (item.spaceId) {
              if (instructionType === 'reorder-above') {
                newItems.push(item.spaceId);
              }
              if (sameFolders && typeof i === 'object') {
                // remove from folder if placing around itself
                const newI = { ...i, content: i.content.filter((sId) => sId !== item.spaceId) };
                if (newI.content.length > 0) newItems.push(newI);
              } else {
                newItems.push(i);
              }
              if (instructionType === 'reorder-below') {
                newItems.push(item.spaceId);
              }
            } else {
              if (instructionType === 'reorder-below') newItems.push(i);
              newItems.push(item.folder);
              if (instructionType === 'reorder-above') newItems.push(i);
            }
            return;
          }
          newItems.push(i);
        });

        const currentInSpaces =
          getAccountData(mx, AccountDataEvent.CinnySpaces)?.getContent<InCinnySpacesContent>() ??
          {};
        const newSpacesContent = {
          ...currentInSpaces,
          sidebar: newItems,
        };
        localEchoSidebarItem(parseSidebar(mx, orphanSpaces, newSpacesContent));
        mx.setAccountData(AccountDataEvent.CinnySpaces, newSpacesContent);
      },
      [mx, sidebarItems, setOpenedFolder, localEchoSidebarItem, orphanSpaces]
    )
  );

  const selectedSpaceId = useSelectedSpace();

  const handleSpaceClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const target = evt.currentTarget;
    const targetSpaceId = target.getAttribute('data-id');
    if (!targetSpaceId) return;

    const activePath = navToActivePath.get(targetSpaceId);
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, targetSpaceId)));
  };

  const handleFolderToggle: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const target = evt.currentTarget;
    const targetFolderId = target.getAttribute('data-id');
    if (!targetFolderId) return;

    setOpenedFolder({
      type: openedFolder.has(targetFolderId) ? 'DELETE' : 'PUT',
      id: targetFolderId,
    });
  };

  if (sidebarItems.length === 0) return null;
  return (
    <>
      <SidebarStackSeparator />
      <SidebarStack>
        {sidebarItems.map((item) => {
          if (typeof item === 'object') {
            if (openedFolder.has(item.id)) {
              return (
                <OpenedSpaceFolder key={item.id} folder={item} onClose={handleFolderToggle}>
                  {item.content.map((sId) => {
                    const space = mx.getRoom(sId);
                    if (!space) return null;
                    return (
                      <SpaceTab
                        key={space.roomId}
                        space={space}
                        selected={space.roomId === selectedSpaceId}
                        onClick={handleSpaceClick}
                        folder={item}
                        onDragging={setDraggingItem}
                        disabled={
                          typeof draggingItem === 'object'
                            ? draggingItem.spaceId === space.roomId
                            : false
                        }
                      />
                    );
                  })}
                </OpenedSpaceFolder>
              );
            }

            return (
              <ClosedSpaceFolder
                key={item.id}
                folder={item}
                selected={!!selectedSpaceId && item.content.includes(selectedSpaceId)}
                onOpen={handleFolderToggle}
                onDragging={setDraggingItem}
                disabled={
                  typeof draggingItem === 'object' ? draggingItem.folder.id === item.id : false
                }
              />
            );
          }

          const space = mx.getRoom(item);
          if (!space) return null;

          return (
            <SpaceTab
              key={space.roomId}
              space={space}
              selected={space.roomId === selectedSpaceId}
              onClick={handleSpaceClick}
              onDragging={setDraggingItem}
              disabled={typeof draggingItem === 'string' ? draggingItem === space.roomId : false}
            />
          );
        })}
      </SidebarStack>
    </>
  );
}
