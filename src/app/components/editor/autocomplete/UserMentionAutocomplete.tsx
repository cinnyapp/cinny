import React, { useEffect, KeyboardEvent as ReactKeyboardEvent, useCallback } from 'react';
import { Editor } from 'slate';
import { Avatar, Icon, Icons, MenuItem, Text } from 'folds';

import { AutocompleteQuery } from './autocompleteQuery';
import { AutocompleteMenu } from './AutocompleteMenu';
import { GetRoomMemberMembershipCallback, useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { UseAsyncSearchOptions, useAsyncSearch } from '../../../hooks/useAsyncSearch';
import { onTabPress } from '../../../utils/keyboard';
import { createMentionElement, moveCursor, replaceWithElement } from '../utils';
import { useKeyDown } from '../../../hooks/useKeyDown';
import { getMxIdServer, isUserId } from '../../../utils/matrix';
import { getMemberSearchStr } from '../../../utils/room';
import { UserAvatar } from '../../user-avatar';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useClient } from '../../../hooks/useClient';
import { JoinRoomMemberObject } from '../../../../client/storage/collections';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { nameInitials } from '../../../utils/common';

type MentionAutoCompleteHandler = (userId: string, name: string) => void;

const userIdFromQueryText = (myUserId: string, text: string) =>
  isUserId(`@${text}`)
    ? `@${text}`
    : `@${text}${text.endsWith(':') ? '' : ':'}${getMxIdServer(myUserId)}`;

function UnknownMentionItem({
  userId,
  name,
  handleAutocomplete,
}: {
  userId: string;
  name: string;
  handleAutocomplete: MentionAutoCompleteHandler;
}) {
  return (
    <MenuItem
      as="button"
      radii="300"
      onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
        onTabPress(evt, () => handleAutocomplete(userId, name))
      }
      onClick={() => handleAutocomplete(userId, name)}
      before={
        <Avatar size="200">
          <UserAvatar
            userId={userId}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      }
    >
      <Text style={{ flexGrow: 1 }} size="B400">
        {name}
      </Text>
    </MenuItem>
  );
}

type UserMentionAutocompleteProps = {
  roomId: string;
  editor: Editor;
  query: AutocompleteQuery<string>;
  requestClose: () => void;
};

const withAllowedMembership =
  (getMembership: GetRoomMemberMembershipCallback) =>
  (member: JoinRoomMemberObject): boolean =>
    getMembership(member.userId) === 'join' ||
    getMembership(member.userId) === 'invite' ||
    getMembership(member.userId) === 'knock';

const SEARCH_OPTIONS: UseAsyncSearchOptions = {
  limit: 1000,
  matchOptions: {
    contain: true,
  },
};

const EMPTY_MEMBER_LIST: JoinRoomMemberObject[] = [];

export function UserMentionAutocomplete({
  roomId,
  editor,
  query,
  requestClose,
}: UserMentionAutocompleteProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const roomAliasOrId = ct.roomToAlias.read.get(roomId) || roomId;
  const membersAPI = useRoomMembersAPI();
  const members = membersAPI.memberEventsResult.value ?? EMPTY_MEMBER_LIST;

  const [result, search, resetSearch] = useAsyncSearch(
    members,
    useCallback((m, q) => getMemberSearchStr(m, q, membersAPI.getName), [membersAPI.getName]),
    SEARCH_OPTIONS
  );

  const autoCompleteMembers = (result ? result.items.slice(0, 20) : members.slice(0, 20)).filter(
    withAllowedMembership(membersAPI.getMembership)
  );

  useEffect(() => {
    if (query.text) search(query.text);
    else resetSearch();
  }, [query.text, search, resetSearch]);

  const handleAutocomplete: MentionAutoCompleteHandler = (uId, name) => {
    const mentionEl = createMentionElement(
      uId,
      name.startsWith('@') ? name : `@${name}`,
      uId === ct.session.userId || roomAliasOrId === uId
    );
    replaceWithElement(editor, query.range, mentionEl);
    moveCursor(editor, true);
    requestClose();
  };

  useKeyDown(window, (evt: KeyboardEvent) => {
    onTabPress(evt, () => {
      if (query.text === 'room') {
        handleAutocomplete(roomAliasOrId, '@room');
        return;
      }
      if (autoCompleteMembers.length === 0) {
        const userId = userIdFromQueryText(ct.session.userId, query.text);
        handleAutocomplete(userId, userId);
        return;
      }
      const roomMember = autoCompleteMembers[0];
      handleAutocomplete(roomMember.userId, membersAPI.getName(roomMember.userId));
    });
  });

  return (
    <AutocompleteMenu headerContent={<Text size="L400">Mentions</Text>} requestClose={requestClose}>
      {query.text === 'room' && (
        <UnknownMentionItem
          userId={roomAliasOrId}
          name="@room"
          handleAutocomplete={handleAutocomplete}
        />
      )}
      {autoCompleteMembers.length === 0 ? (
        <UnknownMentionItem
          userId={userIdFromQueryText(ct.session.userId, query.text)}
          name={userIdFromQueryText(ct.session.userId, query.text)}
          handleAutocomplete={handleAutocomplete}
        />
      ) : (
        autoCompleteMembers.map((roomMember) => {
          const name = membersAPI.getName(roomMember.userId);
          const avatarMxcUrl = membersAPI.getAvatar(roomMember.userId);
          const avatarUrl = avatarMxcUrl
            ? mxcToHttp(ct.session.baseUrl, avatarMxcUrl, useAuthentication).thumbnail({
                width: 32,
                height: 32,
                method: 'crop',
              })
            : undefined;
          return (
            <MenuItem
              key={roomMember.userId}
              as="button"
              radii="300"
              onKeyDown={(evt: ReactKeyboardEvent<HTMLButtonElement>) =>
                onTabPress(evt, () => handleAutocomplete(roomMember.userId, name))
              }
              onClick={() => handleAutocomplete(roomMember.userId, name)}
              after={
                <Text size="T200" priority="300" truncate>
                  {roomMember.userId}
                </Text>
              }
              before={
                <Avatar size="200">
                  <UserAvatar
                    userId={roomMember.userId}
                    src={avatarUrl ?? undefined}
                    alt={name}
                    renderFallback={() => (
                      <Text as="span" size="H6">
                        {nameInitials(name)}
                      </Text>
                    )}
                  />
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
