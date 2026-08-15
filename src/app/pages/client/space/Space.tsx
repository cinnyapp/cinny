import React, {
  MouseEventHandler,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  Avatar,
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Line,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
  color,
  config,
  toRem,
} from 'folds';
import { useVirtualizer } from '@tanstack/react-virtual';
import FocusTrap from 'focus-trap-react';
import { postJoin, PostJoinOK } from 'neurone/lib/api/matrix/client/v3/join';
import { parseMatrixResp, printMatrixError } from 'neurone/lib/matrix-request';
import { mDirectAtom } from '../../../state/mDirectList';
import {
  NavCategory,
  NavCategoryHeader,
  NavItem,
  NavItemContent,
  NavLink,
} from '../../../components/nav';
import { getSpaceLobbyPath, getSpaceRoomPath, getSpaceSearchPath } from '../../pathUtils';
import { getMxIdServer } from '../../../utils/matrix';
import { useSelectedRoom } from '../../../hooks/router/useSelectedRoom';
import {
  useSpaceLobbySelected,
  useSpaceSearchSelected,
} from '../../../hooks/router/useSelectedSpace';
import { useSpace } from '../../../hooks/useSpace';
import { VirtualTile } from '../../../components/virtualizer';
import { RoomNavCategoryButton, RoomNavItem } from '../../../features/room-nav';
import { makeNavCategoryId } from '../../../state/closedNavCategories';
import { useCategoryHandler } from '../../../hooks/useCategoryHandler';
import { useNavToActivePathMapper } from '../../../hooks/useNavToActivePathMapper';
import { useSpaceJoinedHierarchy } from '../../../hooks/useSpaceHierarchy';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { PageNav, PageNavContent, PageNavHeader } from '../../../components/page';
import { usePowerLevels, usePowerLevelsState } from '../../../hooks/usePowerLevels';
import { useRecursiveChildScopeFactory, useSpaceChildren } from '../../../state/hooks/roomList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { UseStateProvider } from '../../../components/UseStateProvider';
import { LeaveSpacePrompt } from '../../../components/leave-space-prompt';
import { copyToClipboard } from '../../../utils/dom';
import { useClosedNavCategoriesAtom } from '../../../state/hooks/closedNavCategories';
import { StateEventType } from '../../../../types/matrix/room';
import { stopPropagation } from '../../../utils/keyboard';
import { getMatrixToRoom } from '../../../plugins/matrix-to';
import { getViaServers } from '../../../plugins/via-servers';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import {
  getRoomNotificationMode,
  useRoomsNotificationPreferencesContext,
} from '../../../hooks/useRoomsNotificationPreferences';
import { useOpenSpaceSettings } from '../../../state/hooks/spaceSettings';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { useRoomPermissions } from '../../../hooks/useRoomPermissions';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { BreakWord } from '../../../styles/Text.css';
import { InviteUserPrompt } from '../../../components/invite-user-prompt';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { useClient } from '../../../hooks/useClient';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../../hooks/storage/useGetRoomAvatar';
import { roomToNotificationsAtom } from '../../../state/room/roomToNotifications';
import {
  getRoomTotalNotifications,
  useRoomsNotifications,
  useRoomsTotalNotifications,
} from '../../../state/hooks/roomNotifications';
import { getJoinRoomStateId } from '../../../../client/storage/collections';
import { useAllJoinedRoomsSet } from '../../../hooks/useGetRoom';
import { unreadRoomsAtom } from '../../../state/room/roomToUnread';
import { useRoomsUnread } from '../../../state/hooks/unread';

type SpaceMenuProps = {
  requestClose: () => void;
};
const SpaceMenu = forwardRef<HTMLDivElement, SpaceMenuProps>(({ requestClose }, ref) => {
  const ct = useClient();
  const { userId } = ct.session;
  const spaceId = useSpace();
  const [hideActivity] = useSetting(settingsAtom, 'hideActivity');
  const roomToParents = useAtomValue(roomToParentsAtom);
  const powerLevelsStateResult = usePowerLevelsState(spaceId);
  const powerLevels = usePowerLevels(powerLevelsStateResult.value);
  const creators = useRoomCreators(spaceId);

  const permissions = useRoomPermissions(creators, powerLevels);
  const canInvite = permissions.action('invite', userId);
  const openSpaceSettings = useOpenSpaceSettings();

  const [invitePrompt, setInvitePrompt] = useState(false);

  const allChild = useSpaceChildren(
    allRoomsAtom,
    spaceId,
    useRecursiveChildScopeFactory(ct, roomToParents)
  );
  const roomToNotifications = useRoomsNotifications(allChild, roomToNotificationsAtom);
  const notifications = useRoomsTotalNotifications(roomToNotifications);

  const handleMarkAsRead = () => {
    // allChild.forEach((childRoomId) => markAsRead(mx, childRoomId, hideActivity));
    requestClose();
  };

  const handleCopyLink = () => {
    const alias = ct.roomToAlias.read.get(spaceId);
    const viaServers = alias ? undefined : getViaServers(creators, powerLevels);
    copyToClipboard(getMatrixToRoom(alias ?? spaceId, viaServers));
    requestClose();
  };

  const handleInvite = () => {
    setInvitePrompt(true);
  };

  const handleRoomSettings = () => {
    openSpaceSettings(spaceId);
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        {invitePrompt && (
          <InviteUserPrompt
            roomId={spaceId}
            requestClose={() => {
              setInvitePrompt(false);
              requestClose();
            }}
          />
        )}
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          disabled={!notifications || notifications.count === 0}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Mark as Read
          </Text>
        </MenuItem>
      </Box>
      <Line variant="Surface" size="300" />
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleInvite}
          variant="Primary"
          fill="None"
          size="300"
          after={<Icon size="100" src={Icons.UserPlus} />}
          radii="300"
          aria-pressed={invitePrompt}
          disabled={!canInvite}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Invite
          </Text>
        </MenuItem>
        <MenuItem
          onClick={handleCopyLink}
          size="300"
          after={<Icon size="100" src={Icons.Link} />}
          radii="300"
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Copy Link
          </Text>
        </MenuItem>
        <MenuItem
          onClick={handleRoomSettings}
          size="300"
          after={<Icon size="100" src={Icons.Setting} />}
          radii="300"
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Space Settings
          </Text>
        </MenuItem>
      </Box>
      <Line variant="Surface" size="300" />
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <UseStateProvider initial={false}>
          {(promptLeave, setPromptLeave) => (
            <>
              <MenuItem
                onClick={() => setPromptLeave(true)}
                variant="Critical"
                fill="None"
                size="300"
                after={<Icon size="100" src={Icons.ArrowGoLeft} />}
                radii="300"
                aria-pressed={promptLeave}
              >
                <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
                  Leave Space
                </Text>
              </MenuItem>
              {promptLeave && (
                <LeaveSpacePrompt
                  roomId={spaceId}
                  onDone={requestClose}
                  onCancel={() => setPromptLeave(false)}
                />
              )}
            </>
          )}
        </UseStateProvider>
      </Box>
    </Menu>
  );
});

type SpaceHeaderProps = {
  spaceName: string;
};
function SpaceHeader({ spaceName }: SpaceHeaderProps) {
  const ct = useClient();
  const spaceId = useSpace();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const joinRule = roomToJoinRule.get(spaceId);

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <>
      <PageNavHeader>
        <Box alignItems="Center" grow="Yes" gap="300">
          <Box grow="Yes" alignItems="Center" gap="100">
            <Text size="H4" truncate>
              {spaceName}
            </Text>
            {joinRule !== 'public' && <Icon src={Icons.Lock} size="50" />}
          </Box>
          <Box shrink="No">
            <IconButton aria-pressed={!!menuAnchor} variant="Background" onClick={handleOpenMenu}>
              <Icon src={Icons.VerticalDots} size="200" />
            </IconButton>
          </Box>
        </Box>
      </PageNavHeader>
      {menuAnchor && (
        <PopOut
          anchor={menuAnchor}
          position="Bottom"
          align="End"
          offset={6}
          content={
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                returnFocusOnDeactivate: false,
                onDeactivate: () => setMenuAnchor(undefined),
                clickOutsideDeactivates: true,
                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
                escapeDeactivates: stopPropagation,
              }}
            >
              <SpaceMenu requestClose={() => setMenuAnchor(undefined)} />
            </FocusTrap>
          }
        />
      )}
    </>
  );
}

type SpaceTombstoneProps = { roomId: string; replacementRoomId: string };
export function SpaceTombstone({ roomId, replacementRoomId }: SpaceTombstoneProps) {
  const ct = useClient();
  const { navigateSpace } = useRoomNavigate();
  const allJoinedRooms = useAllJoinedRoomsSet();

  const [joinState, handleJoin] = useAsyncCallback<PostJoinOK, Error, []>(
    useCallback(async () => {
      const tombstoneEvent = await ct.storage.joinRoomState.read.get(
        getJoinRoomStateId(roomId, StateEventType.RoomTombstone, '')
      );
      const sender = tombstoneEvent?.event.sender;
      const senderServer = sender && getMxIdServer(sender);
      const via = senderServer ? [senderServer] : undefined;
      const response = await ct.requestAuthJSON(
        postJoin({
          pathParams: { roomIdOrAlias: replacementRoomId },
          searchParams: { via, server_name: via },
        })
      );

      const [err, result] = await parseMatrixResp<PostJoinOK>(response);
      if (err) {
        throw new Error(printMatrixError(err));
      }
      return result;
    }, [ct, roomId, replacementRoomId])
  );

  const handleOpen = () => {
    navigateSpace(replacementRoomId);
  };

  return (
    <Box
      style={{
        padding: config.space.S200,
        borderRadius: config.radii.R400,
        borderWidth: config.borderWidth.B300,
      }}
      className={ContainerColor({ variant: 'Surface' })}
      direction="Column"
      gap="300"
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Text size="L400">Space Upgraded</Text>
        <Text size="T200">This space has been replaced and is no longer active.</Text>
        {joinState.status === AsyncStatus.Error && (
          <Text className={BreakWord} style={{ color: color.Critical.Main }} size="T200">
            {(joinState.error as any)?.message ?? 'Failed to join replacement space!'}
          </Text>
        )}
      </Box>
      <Box direction="Column" shrink="No">
        {allJoinedRooms.has(replacementRoomId) || joinState.status === AsyncStatus.Success ? (
          <Button onClick={handleOpen} size="300" variant="Success" fill="Solid" radii="300">
            <Text size="B300">Open New Space</Text>
          </Button>
        ) : (
          <Button
            onClick={handleJoin}
            size="300"
            variant="Primary"
            fill="Solid"
            radii="300"
            before={
              joinState.status === AsyncStatus.Loading && (
                <Spinner size="100" variant="Primary" fill="Solid" />
              )
            }
            disabled={joinState.status === AsyncStatus.Loading}
          >
            <Text size="B300">Join New Space</Text>
          </Button>
        )}
      </Box>
    </Box>
  );
}

export function Space() {
  const ct = useClient();
  const spaceId = useSpace();
  useNavToActivePathMapper(spaceId);
  const spaceRooms = useObservableValue(ct.spaceRooms);
  const roomToAlias = useObservableValue(ct.roomToAlias);
  const roomToReplacement = useObservableValue(ct.roomToReplacement);
  const replacementRoomId = roomToReplacement.get(spaceId);

  const spaceIdOrAlias = roomToAlias.get(spaceId) ?? spaceId;
  const scrollRef = useRef<HTMLDivElement>(null);

  const mDirects = useAtomValue(mDirectAtom);
  const notificationPreferences = useRoomsNotificationPreferencesContext();

  const selectedRoomId = useSelectedRoom();
  const lobbySelected = useSpaceLobbySelected(spaceIdOrAlias);
  const searchSelected = useSpaceSearchSelected(spaceIdOrAlias);

  const [closedCategories, setClosedCategories] = useAtom(useClosedNavCategoriesAtom());

  const hierarchy = useSpaceJoinedHierarchy(spaceId);

  const rooms = useMemo(() => hierarchy.map((item) => item.roomId), [hierarchy]);
  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(rooms);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const roomToNotifications = useRoomsNotifications(rooms, roomToNotificationsAtom);
  const unreadRooms = useRoomsUnread(rooms, unreadRoomsAtom);

  const virtualizer = useVirtualizer({
    count: hierarchy.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 0,
    overscan: 10,
  });

  const handleCategoryClick = useCategoryHandler(setClosedCategories, (categoryId) =>
    closedCategories.has(categoryId)
  );

  const getToLink = (roomId: string) =>
    getSpaceRoomPath(spaceIdOrAlias, roomToAlias.get(roomId) ?? roomId);

  return (
    <PageNav>
      <SpaceHeader spaceName={getRoomName(spaceId) ?? 'Unknown'} />
      <PageNavContent scrollRef={scrollRef}>
        <Box direction="Column" gap="300">
          {replacementRoomId && (
            <SpaceTombstone roomId={spaceId} replacementRoomId={replacementRoomId} />
          )}
          <NavCategory>
            <NavItem variant="Background" radii="400" aria-selected={lobbySelected}>
              <NavLink to={getSpaceLobbyPath(spaceIdOrAlias)}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Flag} size="100" filled={lobbySelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Lobby
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
            <NavItem variant="Background" radii="400" aria-selected={searchSelected}>
              <NavLink to={getSpaceSearchPath(spaceIdOrAlias)}>
                <NavItemContent>
                  <Box as="span" grow="Yes" alignItems="Center" gap="200">
                    <Avatar size="200" radii="400">
                      <Icon src={Icons.Search} size="100" filled={searchSelected} />
                    </Avatar>
                    <Box as="span" grow="Yes">
                      <Text as="span" size="Inherit" truncate>
                        Message Search
                      </Text>
                    </Box>
                  </Box>
                </NavItemContent>
              </NavLink>
            </NavItem>
          </NavCategory>
          <NavCategory
            style={{
              height: virtualizer.getTotalSize(),
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((vItem) => {
              const item = hierarchy[vItem.index] ?? {};
              if (!item) return null;
              const { roomId } = item;

              if (spaceRooms.has(roomId)) {
                const categoryId = makeNavCategoryId(spaceId, roomId);

                return (
                  <VirtualTile
                    virtualItem={vItem}
                    key={vItem.index}
                    ref={virtualizer.measureElement}
                  >
                    <div style={{ paddingTop: vItem.index === 0 ? undefined : config.space.S400 }}>
                      <NavCategoryHeader>
                        <RoomNavCategoryButton
                          data-category-id={categoryId}
                          onClick={handleCategoryClick}
                          closed={closedCategories.has(categoryId)}
                        >
                          {roomId === spaceId ? 'Rooms' : getRoomName(roomId) ?? 'Unknown'}
                        </RoomNavCategoryButton>
                      </NavCategoryHeader>
                    </div>
                  </VirtualTile>
                );
              }

              // TODO: closedCategories.has(makeNavCategoryId(spaceId, parentId)
              const n = roomToNotifications.get(roomId);
              const notifications = n && getRoomTotalNotifications(n);
              return (
                <VirtualTile virtualItem={vItem} key={vItem.index} ref={virtualizer.measureElement}>
                  <RoomNavItem
                    roomId={roomId}
                    roomName={getRoomName(roomId) ?? 'Unknown'}
                    avatarUrl={getRoomAvatar(roomId)}
                    selected={selectedRoomId === roomId}
                    showAvatar={mDirects.has(roomId)}
                    joinRule={roomToJoinRule.get(roomId)}
                    linkPath={getToLink(roomId)}
                    notificationMode={getRoomNotificationMode(notificationPreferences, roomId)}
                    notifications={notifications}
                    unread={unreadRooms.has(roomId)}
                  />
                </VirtualTile>
              );
            })}
          </NavCategory>
        </Box>
      </PageNavContent>
    </PageNav>
  );
}
