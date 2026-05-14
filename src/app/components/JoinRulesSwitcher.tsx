import React, { MouseEventHandler, useCallback, useMemo, useState } from 'react';
import {
  config,
  Box,
  MenuItem,
  Text,
  Icon,
  Icons,
  IconSrc,
  RectCords,
  PopOut,
  Menu,
  Button,
  Spinner,
} from 'folds';
import { JoinRule } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import FocusTrap from 'focus-trap-react';
import { stopPropagation } from '../utils/keyboard';
import { getRoomIconSrc } from '../utils/room';

export type ExtraJoinRules = 'knock_restricted';
export type ExtendedJoinRules = JoinRule | ExtraJoinRules;

type JoinRuleIcons = Record<ExtendedJoinRules, IconSrc>;

export const useJoinRuleIcons = (roomType?: string): JoinRuleIcons =>
  useMemo(
    () => ({
      [JoinRule.Invite]: getRoomIconSrc(Icons, roomType, JoinRule.Invite),
      [JoinRule.Knock]: getRoomIconSrc(Icons, roomType, JoinRule.Knock),
      knock_restricted: getRoomIconSrc(Icons, roomType, JoinRule.Restricted),
      [JoinRule.Restricted]: getRoomIconSrc(Icons, roomType, JoinRule.Restricted),
      [JoinRule.Public]: getRoomIconSrc(Icons, roomType, JoinRule.Public),
      [JoinRule.Private]: getRoomIconSrc(Icons, roomType, JoinRule.Private),
    }),
    [roomType]
  );

type JoinRuleLabels = Record<ExtendedJoinRules, string>;
export const useRoomJoinRuleLabel = (): JoinRuleLabels => {
  const { t } = useTranslation();
  return useMemo(
    () => ({
      [JoinRule.Invite]: t('roomSettings.inviteOnly'),
      [JoinRule.Knock]: t('roomSettings.knockInvite'),
      knock_restricted: t('roomSettings.spaceMembersOrKnock'),
      [JoinRule.Restricted]: t('roomSettings.spaceMembers'),
      [JoinRule.Public]: t('roomSettings.public'),
      [JoinRule.Private]: t('roomSettings.inviteOnly'),
    }),
    [t]
  );
};

type JoinRulesSwitcherProps<T extends ExtendedJoinRules[]> = {
  icons: JoinRuleIcons;
  labels: JoinRuleLabels;
  rules: T;
  value: T[number];
  onChange: (value: T[number]) => void;
  disabled?: boolean;
  changing?: boolean;
};
export function JoinRulesSwitcher<T extends ExtendedJoinRules[]>({
  icons,
  labels,
  rules,
  value,
  onChange,
  disabled,
  changing,
}: JoinRulesSwitcherProps<T>) {
  const { t } = useTranslation();
  const [cords, setCords] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleChange = useCallback(
    (selectedRule: ExtendedJoinRules) => {
      setCords(undefined);
      onChange(selectedRule);
    },
    [onChange]
  );

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: () => setCords(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu>
            <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
              {rules.map((rule) => (
                <MenuItem
                  key={rule}
                  size="300"
                  variant="Surface"
                  radii="300"
                  aria-pressed={value === rule}
                  onClick={() => handleChange(rule)}
                  before={<Icon size="100" src={icons[rule]} />}
                  disabled={disabled}
                >
                  <Box grow="Yes">
                    <Text size="T300">{labels[rule]}</Text>
                  </Box>
                </MenuItem>
              ))}
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <Button
        size="300"
        variant="Secondary"
        fill="Soft"
        radii="300"
        outlined
        before={<Icon size="100" src={icons[value] ?? icons[JoinRule.Restricted]} />}
        after={
          changing ? (
            <Spinner size="100" variant="Secondary" fill="Soft" />
          ) : (
            <Icon size="100" src={Icons.ChevronBottom} />
          )
        }
        onClick={handleOpenMenu}
        disabled={disabled}
      >
        <Text size="B300">{labels[value] ?? t('roomSettings.unsupported')}</Text>
      </Button>
    </PopOut>
  );
}
