import React from 'react';
import { Box, Text, Icon, Icons, MenuItem } from 'folds';
import { CutoutCard } from '../../../components/cutout-card';

type AccountDataListProps = {
  types: string[];
  onSelect: (type: string | null) => void;
};
export function AccountDataList({
  types,
  onSelect,
}: AccountDataListProps) {
  return (
    <Box direction="Column" gap="100">
      <Box justifyContent="SpaceBetween">
        <Text size="L400">Fields</Text>
        <Text size="L400">Total: {types.length}</Text>
      </Box>
      <CutoutCard>
        <MenuItem
          variant="Surface"
          fill="None"
          size="300"
          radii="0"
          before={<Icon size="50" src={Icons.Plus} />}
          onClick={() => onSelect(null)}
        >
          <Box grow="Yes">
            <Text size="T200" truncate>
              Add New
            </Text>
          </Box>
        </MenuItem>
        {types.sort().map((type) => (
          <MenuItem
            key={type}
            variant="Surface"
            fill="None"
            size="300"
            radii="0"
            after={<Icon size="50" src={Icons.ChevronRight} />}
            onClick={() => onSelect(type)}
          >
            <Box grow="Yes">
              <Text size="T200" truncate>
                {type}
              </Text>
            </Box>
          </MenuItem>
        ))}
      </CutoutCard>
    </Box>
  );
}
