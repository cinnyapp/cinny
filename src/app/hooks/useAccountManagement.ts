// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import { useMemo } from 'react';

export const useAccountManagementActions = () => {
  const actions = useMemo(
    () => ({
      profile: 'org.matrix.profile',
      sessionsList: 'org.matrix.devices_list',
      sessionView: 'org.matrix.device_view',
      sessionEnd: 'org.matrix.device_delete',
      accountDeactivate: 'org.matrix.account_deactivate',
      crossSigningReset: 'org.matrix.cross_signing_reset',
    }),
    []
  );

  return actions;
};
