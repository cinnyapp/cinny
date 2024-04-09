import React from 'react';
import { as, Chip, Icon, Icons, Text } from 'folds';

export const RoomNavCategoryButton = as<'button', { closed?: boolean }>(
  ({ closed, style, children, ...props }, ref) => (
    <Chip
      variant="Background"
      radii="400"
      before={<Icon size="50" src={closed ? Icons.ChevronRight : Icons.ChevronBottom} />}
      style={{ flexGrow: 1, ...style }}
      {...props}
      ref={ref}
    >
      <Text size="O400" truncate>
        {children}
      </Text>
    </Chip>
  )
);
