import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config, toRem } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useAtomValue } from 'jotai';
import { getDirectPath, joinPathComponent } from '../../pathUtils';
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
import { markAsRead } from '../../../utils/notifications';
import { stopPropagation } from '../../../utils/keyboard';
import { settingsAtom } from '../../../state/settings';
import { useSetting } from '../../../state/hooks/settings';
import {
  TotalNotifications,
  useRoomsNotifications,
  useRoomsTotalNotifications,
} from '../../../state/hooks/roomNotifications';
import {
  RoomToNotifications,
  roomToNotificationsAtom,
} from '../../../state/room/roomToNotifications';

type DirectMenuProps = {
  directRooms: string[];
  roomToNotifications: RoomToNotifications;
  notifications: TotalNotifications;
  requestClose: () => void;
};
const DirectMenu = forwardRef<HTMLDivElement, DirectMenuProps>(
  ({ directRooms, roomToNotifications, notifications, requestClose }, ref) => {
    const [hideActivity] = useSetting(settingsAtom, 'hideActivity');

    const handleMarkAsRead = () => {
      directRooms.forEach((rId) => {
        const n = roomToNotifications.get(rId);
        if (n?.notification_count && n.notification_count > 0) {
          // markAsRead(mx, rId, hideActivity)
        }
      });
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
            aria-disabled={notifications.count === 0}
          >
            <Text style={{ flexGrow: 1 }} as="span" size="T300" truncate>
              Mark as Read
            </Text>
          </MenuItem>
        </Box>
      </Menu>
    );
  }
);

export function DirectTab() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());

  const directRooms = useDirectRooms();
  const roomsNotifications = useRoomsNotifications(directRooms, roomToNotificationsAtom);
  const notifications = useRoomsTotalNotifications(roomsNotifications);
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
      {notifications.count > 0 && (
        <SidebarItemBadge hasCount={notifications.count > 0}>
          <UnreadBadge highlight={notifications.highlight} count={notifications.count} />
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
              <DirectMenu
                directRooms={directRooms}
                roomToNotifications={roomsNotifications}
                notifications={notifications}
                requestClose={() => setMenuAnchor(undefined)}
              />
            </FocusTrap>
          }
        />
      )}
    </SidebarItem>
  );
}
