import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { MatrixClient, Room, RoomEvent } from 'matrix-js-sdk';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { roomActivityAtom, RoomActivityMap } from '../../state/room/roomActivity';
import { roomToUnreadAtom } from '../../state/room/roomToUnread';
import { roomToParentsAtom } from '../../state/room/roomToParents';
import {
  LiteIndexEntry,
  readLiteIndex,
  searchLiteIndex,
  subscribeLiteIndex,
} from '../../../client/lite-index';
import { markedUnreadAtom } from '../../state/room/markedUnread';
import { mDirectAtom } from '../../state/mDirectList';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useRoomsNotificationPreferencesContext } from '../../hooks/useRoomsNotificationPreferences';
import {
  CHAT_NETWORKS,
  ChatFacts,
  ChatFilter,
  ChatNetwork,
  ChatSort,
  MutedMode,
  detectChatNetwork,
  isChatFilter,
  chatListMembership,
  isQuietChat,
  makeChatFilter,
  sortChats,
  unreadFirst,
} from '../../utils/chatList';

export type ChatListScope = 'home' | 'direct';

const BRIDGE_STATE_TYPES = ['m.bridge', 'uk.half-shot.bridge'];

/** Networks rarely change; remember them per room (except "plain Matrix", which a late `m.bridge` can still correct). */
const networkCache = new WeakMap<Room, ChatNetwork>();

const getRoomNetwork = (room: Room, direct: boolean): ChatNetwork => {
  const cached = networkCache.get(room);
  if (cached) return cached;
  const protocolIds: (string | undefined)[] = [];
  BRIDGE_STATE_TYPES.forEach((type) => {
    room.currentState.getStateEvents(type).forEach((ev) => {
      const id = ev.getContent()?.protocol?.id;
      if (typeof id === 'string') protocolIds.push(id);
    });
  });
  const creator = room.currentState.getStateEvents('m.room.create', '')?.getSender();
  // The other person's id tells the network only in a DM: in a group it would just
  // be whichever member happens to come first.
  const network = detectChatNetwork(protocolIds, [creator, direct ? room.guessDMUserId() : null]);
  if (network !== 'matrix') networkCache.set(room, network);
  return network;
};

const buildFacts = (
  mx: MatrixClient,
  rooms: readonly string[],
  mDirects: Set<string>,
  muted: Set<string>
): Map<string, ChatFacts> => {
  const facts = new Map<string, ChatFacts>();
  rooms.forEach((roomId) => {
    const room = mx.getRoom(roomId);
    if (!room) return;
    const { tags } = room;
    const direct = mDirects.has(roomId);
    facts.set(roomId, {
      roomId,
      // A getter, so name search always sees the current name without rebuilding facts.
      get name() {
        return room.name;
      },
      direct,
      muted: muted.has(roomId),
      archived: !!tags?.['m.lowpriority'],
      favourite: !!tags?.['m.favourite'],
      network: getRoomNetwork(room, direct),
    });
  });
  return facts;
};

/** Re-render when any room's tags (favourite / low priority) change. Rare. */
const useRoomTagsVersion = (mx: MatrixClient): number => {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const onTags = () => setVersion((v) => v + 1);
    mx.on(RoomEvent.Tags, onTags);
    return () => {
      mx.removeListener(RoomEvent.Tags, onTags);
    };
  }, [mx]);
  return version;
};

const EMPTY_ACTIVITY: RoomActivityMap = new Map();

export type ChatListView = {
  items: string[];
  /**
   * The whole "All" list in order, before the name filter / chips narrow it. The
   * startup snapshot is saved from this one: saving `items` would save whatever the
   * user had typed in the filter box at that moment.
   */
  sorted: string[];
  facts: Map<string, ChatFacts>;
  /** Networks that actually have chats in this list, in display order. */
  networks: ChatNetwork[];
  filter: ChatFilter;
  setFilter: (filter: ChatFilter) => void;
  query: string;
  setQuery: (query: string) => void;
  sort: ChatSort;
  setSort: (sort: ChatSort) => void;
  mutedMode: MutedMode;
  setMutedMode: (mode: MutedMode) => void;
  /** Should this row be shown faded (muted/archived)? */
  isDimmed: (roomId: string) => boolean;
  /**
   * Chats that lite mode left out of this load and whose name matches the name
   * filter (see client/lite-index.ts). Empty unless a name is being searched.
   */
  older: LiteIndexEntry[];
};

export const useChatList = (
  rooms: string[],
  scope: ChatListScope,
  selectedRoomId: string | undefined,
  categoryClosed: boolean
): ChatListView => {
  const mx = useMatrixClient();
  const mDirects = useAtomValue(mDirectAtom);
  const notificationPreferences = useRoomsNotificationPreferencesContext();
  const activity = useAtomValue(roomActivityAtom);
  const roomToUnread = useAtomValue(roomToUnreadAtom);
  const markedUnread = useAtomValue(markedUnreadAtom);
  const [hideActivityDots] = useSetting(settingsAtom, 'hideUnreadActivityDots');
  const [storedFilter, setStoredFilter] = useSetting(settingsAtom, 'chatListFilter');
  const [sort, setSort] = useSetting(settingsAtom, 'chatListSort');
  const [mutedMode, setMutedMode] = useSetting(settingsAtom, 'chatListMuted');
  const [query, setQuery] = useState('');
  const roomToParents = useAtomValue(roomToParentsAtom);
  const [showAllRooms] = useSetting(settingsAtom, 'homeShowsAllRooms');
  const tagsVersion = useRoomTagsVersion(mx);

  const facts = useMemo(
    () => buildFacts(mx, rooms, mDirects, notificationPreferences.mute),
    // tagsVersion: rebuild when a favourite / low-priority tag changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mx, rooms, mDirects, notificationPreferences, tagsVersion]
  );

  const networks = useMemo(() => {
    const present = new Set<ChatNetwork>();
    facts.forEach((f) => present.add(f.network));
    // A "Matrix" chip is only useful next to at least one bridged network.
    if (present.size <= 1) return [];
    return CHAT_NETWORKS.filter((n) => present.has(n));
  }, [facts]);

  // The stored filter is shared by Home and Direct; fall back to All where it makes no sense.
  let filter: ChatFilter = isChatFilter(storedFilter) ? storedFilter : 'all';
  if (scope === 'direct' && (filter === 'people' || filter === 'groups')) filter = 'all';
  if (filter.startsWith('net:') && !networks.includes(filter.slice(4) as ChatNetwork)) {
    filter = 'all';
  }

  // In the Muted view you want to see what is new there, so order muted chats normally.
  const effectiveMutedMode: MutedMode = filter === 'muted' ? 'normal' : mutedMode;
  const sortActivity = sort === 'name' ? EMPTY_ACTIVITY : activity;
  const sorted = useMemo(
    () =>
      sortChats(
        rooms,
        facts,
        sortActivity,
        sort === 'name' ? 'name' : 'activity',
        effectiveMutedMode
      ),
    [rooms, facts, sortActivity, sort, effectiveMutedMode]
  );

  const needsUnread =
    filter === 'unread' || filter === 'mentions' || sort === 'unread' || categoryClosed;
  const unreadDeps = needsUnread ? roomToUnread : undefined;
  const markedDeps = needsUnread ? markedUnread : undefined;

  const searching = query.trim().length > 0;
  const needsFilter =
    filter !== 'all' || searching || effectiveMutedMode === 'hide' || categoryClosed;
  const stickyRoomId = needsFilter ? selectedRoomId : undefined;
  const closedSelectedId = categoryClosed ? selectedRoomId : undefined;

  const items = useMemo(() => {
    const isUnread = (roomId: string): boolean => {
      if (markedDeps?.has(roomId)) return true;
      const u = unreadDeps?.get(roomId);
      if (!u) return false;
      return hideActivityDots ? u.total > 0 || u.highlight > 0 : true;
    };
    const hasMention = (roomId: string): boolean => (unreadDeps?.get(roomId)?.highlight ?? 0) > 0;

    let list = sort === 'unread' ? unreadFirst(sorted, isUnread) : sorted;
    if (needsFilter) {
      const keep = makeChatFilter(filter, {
        facts,
        isUnread,
        hasMention,
        mutedMode: effectiveMutedMode,
        query,
        stickyRoomId,
      });
      list = list.filter(keep);
    }
    if (categoryClosed) {
      // Collapsed section: only what still needs you (plus the open chat).
      list = list.filter((roomId) => isUnread(roomId) || roomId === closedSelectedId);
    }
    return list;
  }, [
    sorted,
    sort,
    needsFilter,
    filter,
    facts,
    effectiveMutedMode,
    query,
    stickyRoomId,
    categoryClosed,
    closedSelectedId,
    unreadDeps,
    markedDeps,
    hideActivityDots,
  ]);

  // Skipped ("older") chats are not in `rooms`, so the name filter also looks in the
  // local index lite mode keeps of them. Same membership rule as the real list:
  // Direct = 1:1s; Home = no 1:1s and no space children (unless "all chats in Home").
  const [indexVersion, setIndexVersion] = useState(0);
  useEffect(() => {
    if (!searching) return undefined;
    return subscribeLiteIndex(() => setIndexVersion((v) => v + 1));
  }, [searching]);
  const older = useMemo(() => {
    if (!searching || filter !== 'all') return [];
    return searchLiteIndex(readLiteIndex(), query, {
      isLoaded: (roomId) => !!mx.getRoom(roomId),
      accept: (entry) =>
        chatListMembership(scope, {
          direct: mDirects.has(entry.id),
          hasParent: roomToParents.has(entry.id),
          showAllRooms,
        }),
    });
    // indexVersion: rows arrive in the background; rooms: a chat that was just loaded is no longer "older"
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    searching,
    filter,
    query,
    mx,
    scope,
    mDirects,
    roomToParents,
    showAllRooms,
    indexVersion,
    rooms,
  ]);

  // The "All" list as the user sees it with nothing typed and no chip picked — what the
  // startup snapshot saves (it must not depend on the filter box or the chip).
  const wholeList = useMemo(
    () =>
      mutedMode === 'hide' ? sorted.filter((roomId) => !isQuietChat(facts.get(roomId))) : sorted,
    [sorted, facts, mutedMode]
  );

  const setFilter = useCallback((next: ChatFilter) => setStoredFilter(next), [setStoredFilter]);

  const isDimmed = useCallback(
    (roomId: string) => filter !== 'muted' && isQuietChat(facts.get(roomId)),
    [facts, filter]
  );

  return {
    items,
    sorted: wholeList,
    facts,
    networks,
    filter,
    setFilter,
    query,
    setQuery,
    sort,
    setSort,
    mutedMode,
    setMutedMode,
    isDimmed,
    older,
  };
};
