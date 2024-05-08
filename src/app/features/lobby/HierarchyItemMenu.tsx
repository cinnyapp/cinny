import React, { MouseEventHandler, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  IconButton,
  Icon,
  Icons,
  PopOut,
  Menu,
  MenuItem,
  Text,
  RectCords,
  config,
} from 'folds';
import { HierarchyItem } from '../../hooks/useSpaceHierarchy';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { MSpaceChildContent, StateEvent } from '../../../types/matrix/room';
import { openSpaceSettings, toggleRoomSettings } from '../../../client/action/navigation';

type HierarchyItemMenuProps = {
  item: HierarchyItem & {
    parentId: string;
  };
};
export function HierarchyItemMenu({ item }: HierarchyItemMenuProps) {
  const mx = useMatrixClient();
  const { roomId, parentId, content } = item;
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };
  const handleSettings = () => {
    if (item.space) {
      openSpaceSettings(item.roomId);
    } else {
      toggleRoomSettings(item.roomId);
    }
    setMenuAnchor(undefined);
  };
  const handleToggleSuggested = () => {
    const newContent: MSpaceChildContent = { ...content, suggested: !content.suggested };
    mx.sendStateEvent(parentId, StateEvent.SpaceChild, newContent, roomId);
    setMenuAnchor(undefined);
  };

  const handleRemove = () => {
    mx.sendStateEvent(parentId, StateEvent.SpaceChild, {}, roomId);
    setMenuAnchor(undefined);
  };

  return (
    <Box gap="200" alignItems="Center" shrink="No">
      <IconButton
        onClick={handleOpenMenu}
        size="300"
        variant="SurfaceVariant"
        fill="None"
        radii="300"
        aria-pressed={!!menuAnchor}
      >
        <Icon size="50" src={Icons.VerticalDots} />
      </IconButton>
      {menuAnchor && (
        <PopOut
          anchor={menuAnchor}
          position="Bottom"
          align="End"
          content={
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                returnFocusOnDeactivate: false,
                onDeactivate: () => setMenuAnchor(undefined),
                clickOutsideDeactivates: true,
                isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
                isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              }}
            >
              <Menu>
                <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                  <MenuItem onClick={handleSettings} size="300" radii="300">
                    <Text as="span" size="T300" truncate>
                      Settings
                    </Text>
                  </MenuItem>
                  <MenuItem onClick={handleToggleSuggested} size="300" radii="300">
                    <Text as="span" size="T300" truncate>
                      {content.suggested ? 'Unset Suggested' : 'Set Suggested'}
                    </Text>
                  </MenuItem>
                  <MenuItem
                    onClick={handleRemove}
                    variant="Critical"
                    fill="None"
                    size="300"
                    radii="300"
                  >
                    <Text as="span" size="T300" truncate>
                      Remove
                    </Text>
                  </MenuItem>
                </Box>
              </Menu>
            </FocusTrap>
          }
        />
      )}
    </Box>
  );
}
