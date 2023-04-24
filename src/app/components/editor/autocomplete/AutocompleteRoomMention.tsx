import React, { useCallback, useEffect, useMemo } from 'react';
import { Editor } from 'slate';
import isHotkey from 'is-hotkey';
import { Avatar, AvatarFallback, AvatarImage, Icon, Icons, MenuItem, Text, color } from 'folds';

import { createMentionElement, replaceWithElement } from '../common';
import { getRoomAvatarUrl, joinRuleToIconSrc } from '../../../utils/room';
import { roomIdByActivity } from '../../../../util/sort';
import initMatrix from '../../../../client/initMatrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import {
  ItemStrGetter,
  UseAsyncSearchOptions,
  useAsyncSearch,
} from '../../../hooks/useAsyncSearch';

type AutocompleteRoomMentionProps = {
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

export function AutocompleteRoomMention({
  editor,
  query,
  requestClose,
}: AutocompleteRoomMentionProps) {
  const mx = useMatrixClient();
  const dms: Set<string> = initMatrix.roomList?.directs ?? new Set();

  const allRoomId: string[] = useMemo(() => {
    const { spaces = [], rooms = [], directs = [] } = initMatrix.roomList ?? {};
    return [...spaces, ...rooms, ...directs].sort(roomIdByActivity);
  }, []);

  const getItemStr: ItemStrGetter<string> = useCallback(
    (rId) => {
      const r = mx.getRoom(rId);
      if (!r) return 'Unknown Room';
      const alias = r.getCanonicalAlias();
      if (alias) return [r.name, alias];
      return r.name;
    },
    [mx]
  );

  const [result, search] = useAsyncSearch(allRoomId, getItemStr, SEARCH_OPTIONS);

  useEffect(() => {
    search(query.text);
  }, [query.text, search]);

  if (!result || result.items.length === 0) return null;

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
      {result.items.map((rId) => {
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
            onKeyDown={(evt) => {
              if (isHotkey('tab', evt)) {
                evt.preventDefault();
                evt.currentTarget.click();
              }
            }}
            onClick={() => {
              const mentionEl = createMentionElement(
                rId,
                room.name.startsWith('#') ? room.name : `#${room.name}`,
                false
              );
              replaceWithElement(editor, query.range, mentionEl);
              requestClose();
            }}
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
      })}
    </AutocompleteMenu>
  );
}
