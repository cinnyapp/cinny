import React from 'react';
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

type Autocomplete = {
  id: string;
  label: string;
};

type AutocompleteRoomMentionProps = {
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};
export function AutocompleteRoomMention({
  editor,
  query,
  requestClose,
}: AutocompleteRoomMentionProps) {
  const mx = useMatrixClient();
  const directs: Set<string> = initMatrix.roomList?.directs ?? new Set();

  const autocomplete: Autocomplete[] = mx
    .getRooms()
    .filter((r) => r.name.toLowerCase().replace(/\s/g, '').startsWith(query.text.toLowerCase()))
    .sort((r1, r2) => roomIdByActivity(r1.roomId, r2.roomId))
    .map((r) => ({
      label: r.name,
      id: r.roomId,
    }));

  return autocomplete.length === 0 ? null : (
    <AutocompleteMenu headerContent={<Text size="L400">Rooms</Text>} requestClose={requestClose}>
      {autocomplete.map((s) => {
        const room = mx.getRoom(s.id);
        if (!room) return null;
        const dm = directs.has(room.roomId);
        const avatarUrl = getRoomAvatarUrl(mx, room);
        const iconSrc = !dm && joinRuleToIconSrc(Icons, room.getJoinRule(), room.isSpaceRoom());

        return (
          <MenuItem
            key={s.id}
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
                s.id,
                s.label.startsWith('#') ? s.label : `#${s.label}`,
                false
              );
              replaceWithElement(editor, query.range, mentionEl);
              requestClose();
            }}
            after={
              <Text size="T200" priority="300">
                {room.getCanonicalAlias() ?? s.id}
              </Text>
            }
            before={
              <Avatar size="200">
                {iconSrc && <Icon src={iconSrc} size="100" />}
                {avatarUrl && !iconSrc && <AvatarImage src={avatarUrl} alt={s.label} />}
                {!avatarUrl && !iconSrc && (
                  <AvatarFallback
                    style={{
                      backgroundColor: color.Secondary.Container,
                      color: color.Secondary.OnContainer,
                    }}
                  >
                    <Text size="H6">{s.label[0]}</Text>
                  </AvatarFallback>
                )}
              </Avatar>
            }
          >
            <Text style={{ flexGrow: 1 }} size="B400">
              {s.label}
            </Text>
          </MenuItem>
        );
      })}
    </AutocompleteMenu>
  );
}
