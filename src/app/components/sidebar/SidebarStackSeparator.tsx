/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

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
