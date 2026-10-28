import React, { ReactNode } from 'react';
import { Badge, Chip, Text } from 'folds';

type TabChipProps = {
  selected: boolean;
  onClick: () => void;
  count?: number;
  children: ReactNode;
};
export function TabChip({ selected, onClick, count, children }: TabChipProps) {
  return (
    <Chip
      variant={selected ? 'Primary' : 'Surface'}
      aria-selected={selected}
      outlined={!selected}
      radii="Pill"
      onClick={onClick}
      after={
        count !== undefined &&
        count > 0 && (
          <Badge variant={selected ? 'Primary' : 'Secondary'} fill="Solid" radii="Pill">
            <Text size="L400">{count}</Text>
          </Badge>
        )
      }
    >
      <Text size="T200">{children}</Text>
    </Chip>
  );
}
