import React, { MouseEventHandler, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, config, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { ImageUsage } from '../../plugins/custom-emoji';
import { stopPropagation } from '../../utils/keyboard';

export const useUsageStr = (): ((usage: ImageUsage[]) => string) => {
  const { t } = useTranslation();
  const getUsageStr = (usage: ImageUsage[]): string => {
    const sticker = usage.includes(ImageUsage.Sticker);
    const emoticon = usage.includes(ImageUsage.Emoticon);

    if (sticker && emoticon) return t('imagePack.usageBoth');
    if (sticker) return t('imagePack.usageSticker');
    if (emoticon) return t('imagePack.usageEmoji');
    return t('imagePack.usageBoth');
  };
  return getUsageStr;
};

type UsageSelectorProps = {
  selected: ImageUsage[];
  onChange: (usage: ImageUsage[]) => void;
};
export function UsageSelector({ selected, onChange }: UsageSelectorProps) {
  const getUsageStr = useUsageStr();

  const selectedUsageStr = getUsageStr(selected);
  const isSelected = (usage: ImageUsage[]) => getUsageStr(usage) === selectedUsageStr;

  const allUsages: ImageUsage[][] = useMemo(
    () => [[ImageUsage.Emoticon], [ImageUsage.Sticker], [ImageUsage.Sticker, ImageUsage.Emoticon]],
    []
  );

  return (
    <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
      {allUsages.map((usage) => (
        <MenuItem
          key={getUsageStr(usage)}
          size="300"
          variant={isSelected(usage) ? 'SurfaceVariant' : 'Surface'}
          aria-selected={isSelected(usage)}
          radii="300"
          onClick={() => onChange(usage)}
        >
          <Box grow="Yes">
            <Text size="T300">{getUsageStr(usage)}</Text>
          </Box>
        </MenuItem>
      ))}
    </Box>
  );
}

type UsageSwitcherProps = {
  usage: ImageUsage[];
  canEdit?: boolean;
  onChange: (usage: ImageUsage[]) => void;
};
export function UsageSwitcher({ usage, onChange, canEdit }: UsageSwitcherProps) {
  const getUsageStr = useUsageStr();

  const [menuCords, setMenuCords] = useState<RectCords>();

  const handleSelectUsage: MouseEventHandler<HTMLButtonElement> = (event) => {
    setMenuCords(event.currentTarget.getBoundingClientRect());
  };

  return (
    <>
      <Button
        variant="Secondary"
        fill="Soft"
        size="300"
        radii="300"
        type="button"
        outlined
        aria-disabled={!canEdit}
        after={canEdit && <Icon src={Icons.ChevronBottom} size="100" />}
        onClick={canEdit ? handleSelectUsage : undefined}
      >
        <Text size="B300">{getUsageStr(usage)}</Text>
      </Button>
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
              <UsageSelector
                selected={usage}
                onChange={(usg) => {
                  setMenuCords(undefined);
                  onChange(usg);
                }}
              />
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}
