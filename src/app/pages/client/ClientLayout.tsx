import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from 'folds';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useBindAtoms } from '../../state/hooks/useBindAtoms';
import { ClientNavigation } from './ClientNavigation';

export function ClientLayout() {
  const mx = useMatrixClient();
  useBindAtoms(mx);

  return (
    <Box style={{ height: '100%' }}>
      <Box shrink="No">
        <ClientNavigation />
      </Box>
      <Box grow="Yes">
        <Outlet />
      </Box>
    </Box>
  );
}
