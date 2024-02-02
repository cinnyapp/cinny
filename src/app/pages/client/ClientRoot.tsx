import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from 'folds';

import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useBindAtoms } from '../../state/hooks/useBindAtoms';
import { SidebarNav } from './SidebarNav';

export function ClientRoot() {
  const mx = useMatrixClient();
  useBindAtoms(mx);

  return (
    <Box style={{ height: '100%' }}>
      <Box shrink="No">
        <SidebarNav />
      </Box>
      <Box grow="Yes">
        <Outlet />
      </Box>
    </Box>
  );
}
