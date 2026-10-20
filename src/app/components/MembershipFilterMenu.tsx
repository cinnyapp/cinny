import React from 'react';
import { config, Menu, MenuItem, Text } from 'folds';
import FocusTrap from './focus-trap';
import { stopPropagation } from '../utils/keyboard';
import { useMembershipFilterMenu } from '../hooks/useMemberFilter';

type MembershipFilterMenuProps = {
  requestClose: () => void;
  selected: number;
  onSelect: (index: number) => void;
};
export function MembershipFilterMenu({
  selected,
  onSelect,
  requestClose,
}: MembershipFilterMenuProps) {
  const membershipFilterMenu = useMembershipFilterMenu();

  return (
    <FocusTrap
      focusTrapOptions={{
        initialFocus: false,
        onDeactivate: requestClose,
        clickOutsideDeactivates: true,
        isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
        isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
        escapeDeactivates: stopPropagation,
      }}
    >
      <Menu style={{ padding: config.space.S100 }}>
        {membershipFilterMenu.map((menuItem, index) => (
          <MenuItem
            key={menuItem.name}
            variant="Surface"
            aria-pressed={selected === index}
            size="300"
            radii="300"
            onClick={() => {
              onSelect(index);
              requestClose();
            }}
          >
            <Text size="T300">{menuItem.name}</Text>
          </MenuItem>
        ))}
      </Menu>
    </FocusTrap>
  );
}
