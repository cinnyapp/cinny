import {
  Box,
  config,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Text,
} from 'folds';
import React, { MouseEventHandler, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { ClientContext } from '../../../client/context';
import { stopPropagation } from '../../utils/keyboard';
import { deleteClientStorage } from '../../../client/storage';
import { clearNavToActivePathStore } from '../../state/navToActivePath';
import { deleteClientCryptoStorage } from '../../../client/crypto';

export function ClientRootOptions({ userId, ct }: { userId: string; ct?: ClientContext }) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleToggle: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  const handleClearCache = () => {
    clearNavToActivePathStore(userId);
    if (ct) {
      ct.clearCacheAndReload();
      return;
    }
    deleteClientStorage(userId);
  };

  const handleLogout = async () => {
    if (ct) {
      ct.logout();
      return;
    }

    localStorage.clear();
    await deleteClientCryptoStorage(userId);
    await deleteClientStorage(userId);
  };

  return (
    <IconButton
      style={{
        position: 'absolute',
        top: config.space.S100,
        right: config.space.S100,
      }}
      variant="Background"
      fill="None"
      onClick={handleToggle}
    >
      <Icon size="200" src={Icons.VerticalDots} />
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem onClick={handleClearCache} size="300" radii="300">
                  <Text as="span" size="T300" truncate>
                    Clear Cache and Reload
                  </Text>
                </MenuItem>
                <MenuItem
                  onClick={handleLogout}
                  size="300"
                  radii="300"
                  variant="Critical"
                  fill="None"
                >
                  <Text as="span" size="T300" truncate>
                    Logout
                  </Text>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </IconButton>
  );
}
