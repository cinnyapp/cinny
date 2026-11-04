// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React, { ReactNode } from 'react';
import { Box } from 'folds';

type SidebarContentProps = {
  scrollable: ReactNode;
  sticky: ReactNode;
};
export function SidebarContent({ scrollable, sticky }: SidebarContentProps) {
  return (
    <>
      <Box direction="Column" grow="Yes">
        {scrollable}
      </Box>
      <Box direction="Column" shrink="No">
        {sticky}
      </Box>
    </>
  );
}
