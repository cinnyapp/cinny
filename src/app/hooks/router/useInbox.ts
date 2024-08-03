import { useMatch } from 'react-router-dom';
import {
  getInboxInvitesPath,
  getInboxNotificationsPath,
  getInboxPath,
} from '../../pages/pathUtils';

export const useInboxSelected = (): boolean => {
  const match = useMatch({
    path: getInboxPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useInboxNotificationsSelected = (): boolean => {
  const match = useMatch({
    path: getInboxNotificationsPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};

export const useInboxInvitesSelected = (): boolean => {
  const match = useMatch({
    path: getInboxInvitesPath(),
    caseSensitive: true,
    end: false,
  });

  return !!match;
};
