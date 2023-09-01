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
