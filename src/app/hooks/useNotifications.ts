import { useMatch } from 'react-router-dom';
import {
  getNotificationsInvitesPath,
  getNotificationsMessagesPath,
  getNotificationsPath,
} from '../pages/pathUtils';

export const useNotificationsSelected = (): boolean => {
  const match = useMatch({
    path: getNotificationsPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useNotificationsMessagesSelected = (): boolean => {
  const match = useMatch({
    path: getNotificationsMessagesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useNotificationsInvitesSelected = (): boolean => {
  const match = useMatch({
    path: getNotificationsInvitesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
