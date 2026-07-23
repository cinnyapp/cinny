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
import FocusTrap from 'focus-trap-react';
import { stopPropagation } from '../utils/keyboard';
import { getRoomIconSrc } from '../utils/room';
import { JoinRule } from '../../types/matrix/room';

export type ExtraJoinRules = 'knock_restricted';

type JoinRuleIcons = Record<JoinRule, IconSrc>;

export const useJoinRuleIcons = (roomType?: string): JoinRuleIcons =>
  useMemo(
    () => ({
      invite: getRoomIconSrc(Icons, roomType, 'invite'),
      knock: getRoomIconSrc(Icons, roomType, 'knock'),
      restricted: getRoomIconSrc(Icons, roomType, 'restricted'),
      knock_restricted: getRoomIconSrc(Icons, roomType, 'knock_restricted'),
      public: getRoomIconSrc(Icons, roomType, 'public'),
      private: getRoomIconSrc(Icons, roomType, 'private'),
    }),
    [roomType]
  );

type JoinRuleLabels = Record<JoinRule, string>;
export const useRoomJoinRuleLabel = (): JoinRuleLabels =>
  useMemo(
    () => ({
      invite: 'Invite Only',
      knock: 'Knock & Invite',
      knock_restricted: 'Space Members or Knock',
      restricted: 'Space Members',
      public: 'Public',
      private: 'Invite Only',
    }),
    []
  );

type JoinRulesSwitcherProps<T extends JoinRule[]> = {
  icons: JoinRuleIcons;
  labels: JoinRuleLabels;
  rules: T;
  value: T[number];
  onChange: (value: T[number]) => void;
  disabled?: boolean;
  changing?: boolean;
};
export function JoinRulesSwitcher<T extends JoinRule[]>({
  icons,
  labels,
  rules,
  value,
  onChange,
  disabled,
  changing,
}: JoinRulesSwitcherProps<T>) {
  const [cords, setCords] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleChange = useCallback(
    (selectedRule: JoinRule) => {
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
        before={<Icon size="100" src={icons[value] ?? 'restricted'} />}
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
        <Text size="B300">{labels[value] ?? 'Unsupported'}</Text>
      </Button>
    </PopOut>
  );
}
