// Cinny Project
// Copyright (c) 2021-present Ajay Bura
// SPDX-License-Identifier: AGPL-3.0-only
// https://cinny.in

import React from 'react';
import { Line, toRem } from 'folds';

export function SidebarStackSeparator() {
  return (
    <Line
      role="separator"
      style={{ width: toRem(24), margin: '0 auto' }}
      variant="Background"
      size="300"
    />
  );
}
