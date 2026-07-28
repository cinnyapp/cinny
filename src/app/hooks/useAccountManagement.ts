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
