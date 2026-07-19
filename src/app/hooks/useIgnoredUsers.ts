import { useMemo } from 'react';
import { useAccountData } from './storage/useAccountData';
import { AccountDataType } from '../../types/matrix/accountData';

export type IgnoredUserListContent = {
  ignored_users?: Record<string, object>;
};

export const getIgnoredUsersContent = (userList: string[]): IgnoredUserListContent => {
  const users: Record<string, object> = {};
  userList.forEach((userId) => {
    users[userId] = {};
  });

  return {
    ignored_users: users,
  };
};

export const parseIgnoreUsersContent = (content?: object): string[] => {
  if (
    content &&
    'ignored_users' in content &&
    typeof content.ignored_users === 'object' &&
    content.ignored_users
  ) {
    return Object.keys(content.ignored_users);
  }
  return [];
};

export const useIgnoredUsers = (): string[] => {
  const ignoreEventObjResult = useAccountData(AccountDataType.IgnoredUserList);
  const content = ignoreEventObjResult.value?.content;

  const ignoredUsers = useMemo(() => parseIgnoreUsersContent(content), [content]);

  return ignoredUsers;
};
