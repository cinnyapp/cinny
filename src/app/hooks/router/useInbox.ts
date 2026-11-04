// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

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
