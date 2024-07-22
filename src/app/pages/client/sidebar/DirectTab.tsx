import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config, toRem } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { useDirects } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getDirectPath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { useDirectSelected } from '../../../hooks/router/useDirectSelected';
import { UnreadBadge } from '../../../components/unread-badge';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useDirectRooms } from '../direct/useDirectRooms';
import { markAsRead } from '../../../../client/action/notifications';
import { stopPropagation } from '../../../utils/keyboard';

type DirectMenuProps = {
  requestClose: () => void;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(({ requestClose }, ref) => {
  const orphanRooms = useDirectRooms();
  const unread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
  const mx = useMatrixClient();

  const handleMarkAsRead = () => {
    if (!unread) return;
    orphanRooms.forEach((rId) => markAsRead(mx, rId));
    requestClose();
  };

  return (
    <Menu ref={ref} style={{ maxWidth: toRem(160), width: '100vw' }}>
      <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
        <MenuItem
          onClick={handleMarkAsRead}
          size="300"
          after={<Icon size="100" src={Icons.CheckTwice} />}
          radii="300"
          aria-disabled={!unread}
        >
          <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
            Mark as Read
          </Text>
        </MenuItem>
      </Box>
    </Menu>
  );
});

export function DirectTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());

  const mDirects = useAtomValue(mDirectAtom);
  const directs = useDirects(mx, allRoomsAtom, mDirects);
  const directUnread = useRoomsUnread(directs, roomToUnreadAtom);
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const directSelected = useDirectSelected();

  const handleDirectClick = () => {
    const activePath = navToActivePath.get('direct');
    if (activePath && screenSize !== ScreenSize.Mobile) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getDirectPath());
  };

  const handleContextMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.preventDefault();
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };
  return (
    <SidebarItem active={directSelected}>
      <SidebarItemTooltip tooltip="Direct Messages">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            onClick={handleDirectClick}
            onContextMenu={handleContextMenu}
          >
            <Icon src={Icons.User} filled={directSelected} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {directUnread && (
        <SidebarItemBadge hasCount={directUnread.total > 0}>
          <UnreadBadge highlight={directUnread.highlight > 0} count={directUnread.total} />
        </SidebarItemBadge>
      )}
      {menuAnchor && (
        <PopOut
          anchor={menuAnchor}
          position="Right"
          align="Start"
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
              <DirectMenu requestClose={() => setMenuAnchor(undefined)} />
            </FocusTrap>
          }
        />
      )}
    </SidebarItem>
  );
}
