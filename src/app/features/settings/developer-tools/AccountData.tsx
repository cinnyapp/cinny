import React from 'react';
import { Box, Text, Icon, Icons, Button, MenuItem } from 'folds';
import { AccountDataEvent } from 'neurone/lib/api/types';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { CutoutCard } from '../../../components/cutout-card';
import { useAccountDataEvents } from '../../../hooks/storage/useAccountData';

type AccountDataProps = {
  expand: boolean;
  onExpandToggle: (expand: boolean) => void;
  onSelect: (type: AccountDataEvent | null) => void;
};
export function AccountData({ expand, onExpandToggle, onSelect }: AccountDataProps) {
  const accountDataEventsResult = useAccountDataEvents();
  const accountDataEvents = accountDataEventsResult.value;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Account Data</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Global"
          description="Data stored in your global account data."
          after={
            <Button
              onClick={() => onExpandToggle(!expand)}
              variant="Secondary"
              fill="Soft"
              size="300"
              radii="300"
              outlined
              before={
                <Icon src={expand ? Icons.ChevronTop : Icons.ChevronBottom} size="100" filled />
              }
            >
              <Text size="B300">{expand ? 'Collapse' : 'Expand'}</Text>
            </Button>
          }
        />
        {expand && (
          <Box direction="Column" gap="100">
            <Box justifyContent="SpaceBetween">
              <Text size="L400">Events</Text>
              {accountDataEvents && <Text size="L400">Total: {accountDataEvents.length}</Text>}
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
              {accountDataEvents
                ?.sort((e1, e2) => (e1 < e2 ? -1 : 1))
                .map((event) => (
                  <MenuItem
                    key={event.type}
                    variant="Surface"
                    fill="None"
                    size="300"
                    radii="0"
                    after={<Icon size="50" src={Icons.ChevronRight} />}
                    onClick={() => onSelect(event)}
                  >
                    <Box grow="Yes">
                      <Text size="T200" truncate>
                        {event.type}
                      </Text>
                    </Box>
                  </MenuItem>
                ))}
            </CutoutCard>
          </Box>
        )}
      </SequenceCard>
    </Box>
  );
}
