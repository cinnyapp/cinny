import React, { KeyboardEvent as ReactKeyboardEvent, useCallback, useEffect, useMemo } from 'react';
import { Editor } from 'slate';
import { Avatar, Icon, Icons, MenuItem, Text } from 'folds';
import { useAtomValue } from 'jotai';

import { createMentionElement, moveCursor, replaceWithElement } from '../utils';
import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { getMxIdServer, isRoomAlias, isRoomId } from '../../../utils/matrix';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { factoryRoomIdByAtoZ } from '../../../utils/sort';
import { RoomAvatar, RoomIcon } from '../../room-avatar';
import { getViaServers } from '../../../plugins/via-servers';
import { useClient } from '../../../hooks/useClient';
import { useRoomHeroes } from '../../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../../hooks/storage/useGetRoomAvatar';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { nameInitials } from '../../../utils/common';

type MentionAutoCompleteHandler = (roomAliasOrId: string, name: string) => void;

const roomAliasFromQueryText = (myUserId: string, text: string) =>
  isRoomAlias(`#${text}`)
    ? `#${text}`
    : `#${text}${text.endsWith(':') ? '' : ':'}${getMxIdServer(myUserId)}`;

function UnknownRoomMentionItem({
  query,
  handleAutocomplete,
}: {
  query: AutocompleteQuery<string>;
  handleAutocomplete: MentionAutoCompleteHandler;
}) {
  const ct = useClient();
  const roomAlias: string = roomAliasFromQueryText(ct.session.userId, query.text);

  const handleSelect = () => handleAutocomplete(roomAlias, roomAlias);

  return (
    <MenuItem
      as="button"
      radii="300"
      onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) => onTabPress(evt, handleSelect)}
      onClick={handleSelect}
      before={
        <Avatar size="200">
          <Icon src={Icons.Hash} size="100" />
        </Avatar>
      }
    >
      <Text style={{ flexGrow: 1 }} size="B400">
        {roomAlias}
      </Text>
    </MenuItem>
  );
}

type RoomMentionAutocompleteProps = {
  roomId: string;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  matchOptions: {
    contain: true,
  },
};

export function RoomMentionAutocomplete({
  roomId,
  editor,
  query,
  requestClose,
}: RoomMentionAutocompleteProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const mDirects = useAtomValue(mDirectAtom);
  const rooms = useAtomValue(allRoomsAtom);

  const [getRoomHeroes, roomToHeroMembersResult] = useRoomHeroes(rooms);
  const getRoomName = useGetRoomName(getRoomHeroes, roomToHeroMembersResult.value);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes, roomToHeroMembersResult.value);

  const allRooms = useMemo(
    () => Array.from(rooms).sort(factoryRoomIdByAtoZ(getRoomName)),
    [rooms, getRoomName]
  );
  const [result, search, resetSearch] = useAsyncSearch(
    allRooms,
    useCallback(
      (rId) => {
        const name = getRoomName(rId);
        if (!name) return 'Unknown Room';
        const alias = ct.roomToAlias.read.get(rId);
        if (alias) return [name, alias];
        return name;
      },
      [ct, getRoomName]
    ),
    SEARCH_OPTIONS
  );

  const autoCompleteRoomIds = result ? result.items.slice(0, 20) : allRooms.slice(0, 20);

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  const handleAutocomplete: MentionAutoCompleteHandler = (roomAliasOrId, name) => {
    const creators = isRoomId(roomAliasOrId)
      ? ct.roomToCreators.read.get(roomAliasOrId)
      : undefined;
    const viaServers = creators ? getViaServers(creators) : undefined;
    const mentionEl = createMentionElement(
      roomAliasOrId,
      name.startsWith('#') ? name : `#${name}`,
      roomId === roomAliasOrId || ct.roomToAlias.read.get(roomId) === roomAliasOrId,
      undefined,
      viaServers
    );
    replaceWithElement(editor, query.range, mentionEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onTabPress(evt, () => {
      if (autoCompleteRoomIds.length === 0) {
        const alias = roomAliasFromQueryText(ct.session.userId, query.text);
        handleAutocomplete(alias, alias);
        return;
      }
      const rId = autoCompleteRoomIds[0];
      const name = getRoomName(rId) ?? 'Unknown';
      handleAutocomplete(ct.roomToAlias.read.get(rId) ?? rId, name);
    });
  });

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
      {autoCompleteRoomIds.length === 0 ? (
        <UnknownRoomMentionItem query={query} handleAutocomplete={handleAutocomplete} />
      ) : (
        autoCompleteRoomIds.map((rId) => {
          const dm = mDirects.has(rId);
          const name = getRoomName(rId) ?? 'Unknown';
          const alias = ct.roomToAlias.read.get(rId);
          const avatarMxc = getRoomAvatar(rId);
          const avatar = avatarMxc
            ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
                width: 32,
                height: 32,
                method: 'crop',
              })
            : undefined;

          const handleSelect = () => handleAutocomplete(alias ?? rId, name);

          return (
            <MenuItem
              key={rId}
              as="button"
              radii="300"
              onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                onTabPress(evt, handleSelect)
              }
              onClick={handleSelect}
              after={
                <Text size="T200" priority="300" truncate>
                  {alias}
                </Text>
              }
              before={
                <Avatar size="200">
                  {dm ? (
                    <RoomAvatar
                      roomId={rId}
                      src={avatar}
                      alt={name}
                      renderFallback={() => (
                        <Text as="span" size="H6">
                          {nameInitials(name)}
                        </Text>
                      )}
                    />
                  ) : (
                    <RoomIcon
                      size="100"
                      joinRule={ct.roomToJoinRule.read.get(rId)}
                      space={ct.spaceRooms.read.has(rId)}
                    />
                  )}
                </Avatar>
              }
            >
              <Text style={{ flexGrow: 1 }} size="B400" truncate>
                {name}
              </Text>
            </MenuItem>
          );
        })
      )}
    </AutocompleteMenu>
  );
}
