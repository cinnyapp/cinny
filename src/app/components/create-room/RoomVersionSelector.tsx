import React, { MouseEventHandler, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  config,
  Icon,
  Icons,
  Menu,
  PopOut,
  RectCords,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useTranslation } from 'react-i18next';
import { SettingTile } from '../setting-tile';
import { SequenceCard } from '../sequence-card';
import { stopPropagation } from '../../utils/keyboard';

export function RoomVersionSelector({
  versions,
  value,
  onChange,
  disabled,
}: {
  versions: string[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (version: string) => {
    setMenuCords(undefined);
    onChange(version);
  };

  return (
    <SequenceCard
      style={{ padding: config.space.S300 }}
      variant="SurfaceVariant"
      direction="Column"
      gap="500"
    >
      <SettingTile
        title={t('create.version')}
        after={
          <PopOut
            anchor={menuCords}
            offset={5}
            position="Bottom"
            align="End"
            content={
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setMenuCords(undefined),
                  clickOutsideDeactivates: true,
                  isKeyForward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
                  isKeyBackward: (evt: KeyboardEvent) =>
                    evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Menu>
                  <Box
                    direction="Column"
                    gap="200"
                    style={{ padding: config.space.S200, maxWidth: toRem(300) }}
                  >
                    <Text size="L400">{t('create.versions')}</Text>
                    <Box wrap="Wrap" gap="100">
                      {versions.map((version) => (
                        <Chip
                          key={version}
                          variant={value === version ? 'Primary' : 'SurfaceVariant'}
                          aria-pressed={value === version}
                          outlined={value === version}
                          radii="300"
                          onClick={() => handleSelect(version)}
                          type="button"
                        >
                          <Text truncate size="T300">
                            {version}
                          </Text>
                        </Chip>
                      ))}
                    </Box>
                  </Box>
                </Menu>
              </FocusTrap>
            }
          >
            <Button
              type="button"
              onClick={handleMenu}
              size="300"
              variant="Secondary"
              fill="Soft"
              radii="300"
              aria-pressed={!!menuCords}
              before={<Icon size="50" src={menuCords ? Icons.ChevronTop : Icons.ChevronBottom} />}
              disabled={disabled}
            >
              <Text size="B300">{value}</Text>
            </Button>
          </PopOut>
        }
      />
    </SequenceCard>
  );
}
