/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { ReactNode } from 'react';
import {
  RoomsNotificationPreferencesProvider,
  useRoomsNotificationPreferences,
} from '../../hooks/useRoomsNotificationPreferences';

export function ClientRoomsNotificationPreferences({ children }: { children: ReactNode }) {
  const preferences = useRoomsNotificationPreferences();

  return (
    <RoomsNotificationPreferencesProvider value={preferences}>
      {children}
    </RoomsNotificationPreferencesProvider>
  );
}
