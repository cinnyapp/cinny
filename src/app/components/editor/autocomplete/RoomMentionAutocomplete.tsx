import React, { useCallback, useEffect, useMemo } from 'react';
import { Editor } from 'slate';
import { Avatar, AvatarFallback, AvatarImage, Icon, Icons, MenuItem, Text, color } from 'folds';

import { createMentionElement, replaceWithElement } from '../common';
import { getRoomAvatarUrl, joinRuleToIconSrc } from '../../../utils/room';
import { roomIdByActivity } from '../../../../util/sort';
import initMatrix from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { getMxIdServer, validMxId } from '../../../utils/matrix';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';

type MentionAutoCompleteHandler = (roomId: string, name: string) => void;

function UnknownRoomMentionItem({
  query,
  handleAutocomplete,
}: {
  query: AutocompleteQuery<string>;
  handleAutocomplete: MentionAutoCompleteHandler;
}) {
  const mx = useMatrixClient();
  const roomId: string = validMxId(`#${query.text}`)
    ? query.text
    : `#${query.text}:${getMxIdServer(mx.getUserId() ?? '')}`;

  return (
    <MenuItem
      as="button"
      radii="300"
      onKeyDown={(evt) => onTabPress(evt, () => handleAutocomplete(roomId, roomId))}
      onClick={() => handleAutocomplete(roomId, roomId)}
      before={
        <Avatar size="200">
          <Icon src={Icons.Hash} size="100" />
        </Avatar>
      }
    >
      <Text style={{ flexGrow: 1 }} size="B400">
        {roomId}
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
  limit: 20,
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
  const mx = useMatrixClient();
  const dms: Set<string> = initMatrix.roomList?.directs ?? new Set();

  const allRoomId: string[] = useMemo(() => {
    const { spaces = [], rooms = [], directs = [] } = initMatrix.roomList ?? {};
    return [...spaces, ...rooms, ...directs].sort(roomIdByActivity);
  }, []);

  const [result, search] = useAsyncSearch(
    allRoomId,
    useCallback(
      (rId) => {
        const r = mx.getRoom(rId);
        if (!r) return 'Unknown Room';
        const alias = r.getCanonicalAlias();
        if (alias) return [r.name, alias];
        return r.name;
      },
      [mx]
    ),
    SEARCH_OPTIONS
  );

  const autoCompleteRoomIds = result ? result.items : allRoomId.slice(0, 20);

  useEffect(() => {
    search(query.text);
  }, [query.text, search]);

  const handleAutocomplete: MentionAutoCompleteHandler = (rId, name) => {
    const mentionEl = createMentionElement(
      rId,
      name.startsWith('#') ? name : `#${name}`,
      roomId === rId
    );
    replaceWithElement(editor, query.range, mentionEl);
    requestClose();
  };

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
      {autoCompleteRoomIds.length === 0 ? (
        <UnknownRoomMentionItem query={query} handleAutocomplete={handleAutocomplete} />
      ) : (
        autoCompleteRoomIds.map((rId) => {
          const room = mx.getRoom(rId);
          if (!room) return null;
          const dm = dms.has(room.roomId);
          const avatarUrl = getRoomAvatarUrl(mx, room);
          const iconSrc = !dm && joinRuleToIconSrc(Icons, room.getJoinRule(), room.isSpaceRoom());

          return (
            <MenuItem
              key={rId}
              as="button"
              radii="300"
              onKeyDown={(evt) => onTabPress(evt, () => handleAutocomplete(rId, room.name))}
              onClick={() => handleAutocomplete(rId, room.name)}
              after={
                <Text size="T200" priority="300">
                  {room.getCanonicalAlias() ?? ''}
                </Text>
              }
              before={
                <Avatar size="200">
                  {iconSrc && <Icon src={iconSrc} size="100" />}
                  {avatarUrl && !iconSrc && <AvatarImage src={avatarUrl} alt={room.name} />}
                  {!avatarUrl && !iconSrc && (
                    <AvatarFallback
                      style={{
                        backgroundColor: color.Secondary.Container,
                        color: color.Secondary.OnContainer,
                      }}
                    >
                      <Text size="H6">{room.name[0]}</Text>
                    </AvatarFallback>
                  )}
                </Avatar>
              }
            >
              <Text style={{ flexGrow: 1 }} size="B400">
                {room.name}
              </Text>
            </MenuItem>
          );
        })
      )}
    </AutocompleteMenu>
  );
}
