import FocusTrap from 'focus-trap-react';
import {
  Avatar,
  Box,
  config,
  Icon,
  Icons,
  Input,
  Line,
  MenuItem,
  Modal,
  Overlay,
  OverlayCenter,
  Scroll,
  Text,
  toRem,
} from 'folds';
import React, {
  ChangeEventHandler,
  KeyboardEventHandler,
  MouseEventHandler,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { isKeyHotkey } from 'is-hotkey';
import { useAtom, useAtomValue } from 'jotai';
import { useDirects, useOrphanSpaces, useRooms, useSpaces } from '../../state/hooks/roomList';
import { mDirectAtom } from '../../state/mDirectList';
import { allRoomsAtom } from '../../state/room-list/roomList';
import {
  SearchItemStrGetter,
  useAsyncSearch,
  UseAsyncSearchOptions,
} from '../../hooks/useAsyncSearch';
import { RoomAvatar, RoomIcon } from '../../components/room-avatar';
import { getAllParents, guessPerfectParent } from '../../utils/room';
import { highlightText, makeHighlightRegex } from '../../plugins/react-custom-html-parser';
import { factoryRoomIdByActivity } from '../../utils/sort';
import { nameInitials } from '../../utils/common';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { useListFocusIndex } from '../../hooks/useListFocusIndex';
import { getMxIdLocalPart, getMxIdServer } from '../../utils/matrix';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import { unreadRoomsAtom } from '../../state/room/roomToUnread';
import { UnreadBadge, UnreadBadgeCenter } from '../../components/unread-badge';
import { searchModalAtom } from '../../state/searchModal';
import { useKeyDown } from '../../hooks/useKeyDown';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { KeySymbol } from '../../utils/key-symbol';
import { isMacOS } from '../../utils/user-agent';
import { useClient } from '../../hooks/useClient';
import { useObservableValue } from '../../hooks/useObservableValue';
import { roomToNotificationsAtom } from '../../state/room/roomToNotifications';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import { getRoomTotalNotifications } from '../../state/hooks/roomNotifications';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useRoomsPowerLevels } from '../../hooks/usePowerLevels';

enum SearchRoomType {
  Rooms = '#',
  Spaces = '*',
  Directs = '@',
}

const getSearchPrefixToRoomType = (prefix: string): SearchRoomType | undefined => {
  if (prefix === '#') return SearchRoomType.Rooms;
  if (prefix === '*') return SearchRoomType.Spaces;
  if (prefix === '@') return SearchRoomType.Directs;
  return undefined;
};

const useTopActiveRooms = (
  searchRoomType: SearchRoomType | undefined,
  rooms: string[],
  directs: string[],
  spaces: string[]
) => {
  const ct = useClient();
  const roomToLatestEvent = useObservableValue(ct.roomToLatestEvent);

  return useMemo(() => {
    const getTimestamp = (rId: string) => roomToLatestEvent.get(rId)?.origin_server_ts;

    if (searchRoomType === SearchRoomType.Spaces) {
      return spaces;
    }
    if (searchRoomType === SearchRoomType.Directs) {
      return [...directs].sort(factoryRoomIdByActivity(getTimestamp)).slice(0, 20);
    }
    if (searchRoomType === SearchRoomType.Rooms) {
      return [...rooms].sort(factoryRoomIdByActivity(getTimestamp)).slice(0, 20);
    }
    return [...rooms, ...directs].sort(factoryRoomIdByActivity(getTimestamp)).slice(0, 20);
  }, [roomToLatestEvent, rooms, directs, spaces, searchRoomType]);
};

const useSearchTargetRooms = (
  searchRoomType: SearchRoomType | undefined,
  rooms: string[],
  directs: string[],
  spaces: string[]
) =>
  useMemo(() => {
    if (searchRoomType === undefined) {
      return [...rooms, ...directs, ...spaces];
    }
    if (searchRoomType === SearchRoomType.Rooms) return rooms;
    if (searchRoomType === SearchRoomType.Spaces) return spaces;
    if (searchRoomType === SearchRoomType.Directs) return directs;

    return [];
  }, [rooms, spaces, directs, searchRoomType]);

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
  normalizeOptions: {
    ignoreWhitespace: false,
  },
};

type SearchProps = {
  requestClose: () => void;
};
export function Search({ requestClose }: SearchProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const unreadRooms = useAtomValue(unreadRoomsAtom);
  const roomToNotifications = useAtomValue(roomToNotificationsAtom);

  const [searchRoomType, setSearchRoomType] = useState<SearchRoomType>();

  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(ct, allRoomsAtom, roomToParents);
  const mDirects = useAtomValue(mDirectAtom);
  const rooms = useRooms(ct, allRoomsAtom, mDirects);
  const spaces = useSpaces(ct, allRoomsAtom);
  const directs = useDirects(ct, allRoomsAtom, mDirects);
  const directRoomToUser = useObservableValue(ct.directRoomToUser);
  const roomToPowerLevels = useRoomsPowerLevels(ct.rooms.join.read);

  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);

  const topActiveRooms = useTopActiveRooms(searchRoomType, rooms, directs, spaces);
  const targetRooms = useSearchTargetRooms(searchRoomType, rooms, directs, spaces);

  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(directs);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);

  const getTargetStr: SearchItemStrGetter<string> = useCallback(
    (roomId: string) => {
      const roomName = getRoomName(roomId) ?? 'Unknown';
      if (mDirects.has(roomId)) {
        const dmUser = directRoomToUser.get(roomId);
        const targetUsername = dmUser && getMxIdLocalPart(dmUser);
        if (targetUsername) return [roomName, targetUsername];
      }
      return roomName;
    },
    [directRoomToUser, getRoomName, mDirects]
  );

  const [result, search, resetSearch] = useAsyncSearch(targetRooms, getTargetStr, SEARCH_OPTIONS);
  const roomsToRender = result ? result.items : topActiveRooms;
  const listFocus = useListFocusIndex(roomsToRender.length, 0);

  const queryHighlighRegex = result?.query
    ? makeHighlightRegex(result.query.split(' '))
    : undefined;

  const openRoomId = (roomId: string, isSpace: boolean) => {
    if (isSpace) navigateSpace(roomId);
    else navigateRoom(roomId);
    requestClose();
  };

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    listFocus.reset();

    const target = evt.currentTarget;
    let value = target.value.trim();
    const prefix = value.match(/^[#@*]/)?.[0];
    const searchType = typeof prefix === 'string' && getSearchPrefixToRoomType(prefix);
    if (searchType) {
      value = value.slice(1);
      setSearchRoomType(searchType);
    } else {
      setSearchRoomType(undefined);
    }

    if (value === '') {
      resetSearch();
      return;
    }
    search(value);
  };

  const handleInputKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    const roomId = roomsToRender[listFocus.index];
    if (isKeyHotkey('enter', evt) && roomId) {
      openRoomId(roomId, spaces.includes(roomId));
      return;
    }
    if (isKeyHotkey('arrowdown', evt)) {
      evt.preventDefault();
      listFocus.next();
      return;
    }
    if (isKeyHotkey('arrowup', evt)) {
      evt.preventDefault();
      listFocus.previous();
    }
  };

  const handleRoomClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const target = evt.currentTarget;
    const roomId = target.getAttribute('data-room-id');
    const isSpace = target.getAttribute('data-space') === 'true';
    if (!roomId) return;
    openRoomId(roomId, isSpace);
  };

  useEffect(() => {
    const scrollView = scrollRef.current;
    const focusedItem = scrollView?.querySelector(`[data-focus-index="${listFocus.index}"]`);

    if (focusedItem && scrollView) {
      focusedItem.scrollIntoView({
        block: 'center',
      });
    }
  }, [listFocus.index]);

  return (
    <Overlay open>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: () => inputRef.current,
            returnFocusOnDeactivate: false,
            allowOutsideClick: true,
            clickOutsideDeactivates: true,
            onDeactivate: requestClose,
            escapeDeactivates: (evt) => {
              evt.stopPropagation();
              return true;
            },
          }}
        >
          <Modal size="400" style={{ maxHeight: toRem(400), borderRadius: config.radii.R500 }}>
            <Box
              shrink="No"
              style={{ padding: config.space.S400, paddingBottom: 0 }}
              direction="Column"
            >
              <Input
                ref={inputRef}
                size="500"
                variant="Background"
                radii="400"
                outlined
                placeholder="Search"
                before={<Icon size="200" src={Icons.Search} />}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </Box>
            <Box grow="Yes">
              {roomsToRender.length === 0 && (
                <Box
                  style={{ paddingTop: config.space.S700 }}
                  grow="Yes"
                  alignItems="Center"
                  justifyContent="Center"
                  direction="Column"
                  gap="100"
                >
                  <Text size="H6" align="Center">
                    {result ? 'No Match Found' : 'No Rooms'}
                  </Text>
                  <Text size="T200" align="Center">
                    {result
                      ? `No match found for "${result.query}".`
                      : `You do not have any Rooms to display yet.`}
                  </Text>
                </Box>
              )}
              {roomsToRender.length > 0 && (
                <Scroll ref={scrollRef} size="300" hideTrack>
                  <div style={{ padding: config.space.S400, paddingRight: config.space.S200 }}>
                    {roomsToRender.map((roomId, index) => {
                      const dm = mDirects.has(roomId);
                      const dmUserId = dm && directRoomToUser.get(roomId);
                      const dmUsername = dmUserId && getMxIdLocalPart(dmUserId);
                      const dmUserServer = dmUserId && getMxIdServer(dmUserId);
                      const isSpace = ct.spaceRooms.read.has(roomId);

                      const allParents = getAllParents(roomToParents, roomId);
                      const orphanParents =
                        allParents && orphanSpaces.filter((o) => allParents.has(o));
                      const perfectOrphanParent =
                        orphanParents &&
                        guessPerfectParent(
                          roomId,
                          orphanParents,
                          (rId) => ct.roomToCreators.read.get(rId),
                          (rId) => roomToPowerLevels.get(rId)
                        );

                      const exactParents = roomToParents.get(roomId);
                      const perfectParent =
                        exactParents &&
                        guessPerfectParent(
                          roomId,
                          Array.from(exactParents),
                          (rId) => ct.roomToCreators.read.get(rId),
                          (rId) => roomToPowerLevels.get(rId)
                        );

                      const unread = unreadRooms.has(roomId);
                      const n = roomToNotifications.get(roomId);
                      const notifications = n && getRoomTotalNotifications(n);
                      const unreadOrNotification =
                        (notifications && notifications.count > 0) || unread;

                      const avatarMxc = getRoomAvatar(roomId);
                      const roomName: string = getRoomName(roomId) ?? 'Unknown';

                      return (
                        <MenuItem
                          key={roomId}
                          as="button"
                          data-focus-index={index}
                          data-room-id={roomId}
                          data-space={isSpace}
                          onClick={handleRoomClick}
                          variant={listFocus.index === index ? 'Primary' : 'Surface'}
                          aria-pressed={listFocus.index === index}
                          radii="400"
                          after={
                            <Box gap="100">
                              {dmUserServer && (
                                <Text size="T200" priority="300" truncate>
                                  <b>{dmUserServer}</b>
                                </Text>
                              )}
                              {!dm && perfectOrphanParent && (
                                <Text size="T200" priority="300" truncate>
                                  <b>{getRoomName(perfectOrphanParent) ?? perfectOrphanParent}</b>
                                </Text>
                              )}
                              {unreadOrNotification && (
                                <UnreadBadgeCenter>
                                  <UnreadBadge
                                    highlight={notifications?.highlight}
                                    count={notifications?.count ?? 0}
                                  />
                                </UnreadBadgeCenter>
                              )}
                            </Box>
                          }
                          before={
                            <Avatar size="200" radii={dm ? '400' : '300'}>
                              {dm || isSpace ? (
                                <RoomAvatar
                                  roomId={roomId}
                                  src={
                                    avatarMxc &&
                                    mxcToHttp(
                                      ct.session.baseUrl,
                                      avatarMxc,
                                      useAuthentication
                                    ).thumbnail({ width: 32, height: 32, method: 'crop' })
                                  }
                                  alt={roomName}
                                  renderFallback={() => (
                                    <Text as="span" size="H6">
                                      {nameInitials(roomName)}
                                    </Text>
                                  )}
                                />
                              ) : (
                                <RoomIcon
                                  size="100"
                                  joinRule={roomToJoinRule.get(roomId)}
                                  roomType={ct.roomToType.read.get(roomId)}
                                />
                              )}
                            </Avatar>
                          }
                        >
                          <Box grow="Yes" alignItems="Center" gap="100">
                            <Text size="T400" truncate>
                              {queryHighlighRegex
                                ? highlightText(queryHighlighRegex, [roomName])
                                : roomName}
                            </Text>
                            {dmUsername && (
                              <Text as="span" size="T200" priority="300" truncate>
                                @
                                {queryHighlighRegex
                                  ? highlightText(queryHighlighRegex, [dmUsername])
                                  : dmUsername}
                              </Text>
                            )}
                            {!dm && perfectParent && perfectParent !== perfectOrphanParent && (
                              <Text size="T200" priority="300" truncate>
                                — {getRoomName(perfectParent) ?? perfectParent}
                              </Text>
                            )}
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </div>
                </Scroll>
              )}
            </Box>
            <Line size="300" />
            <Box shrink="No" justifyContent="Center" style={{ padding: config.space.S200 }}>
              <Text size="T200" priority="300">
                Type <b>#</b> for rooms, <b>@</b> for DMs and <b>*</b> for spaces. Hotkey:{' '}
                <b>{isMacOS() ? KeySymbol.Command : 'Ctrl'} + k</b>
              </Text>
            </Box>
          </Modal>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

export function SearchModalRenderer() {
  const [opened, setOpen] = useAtom(searchModalAtom);

  useKeyDown(
    window,
    useCallback(
      (event) => {
        if (isKeyHotkey('mod+k', event)) {
          event.preventDefault();
          if (opened) {
            setOpen(false);
            return;
          }

          const portalContainer = document.getElementById('portalContainer');
          if (portalContainer && portalContainer.children.length > 0) {
            return;
          }
          setOpen(true);
        }
      },
      [opened, setOpen]
    )
  );

  return opened ? <Search requestClose={() => setOpen(false)} /> : null;
}
