import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { getHomePath, joinPathComponent } from '../../pathUtils';
import {
  SidebarAvatar,
  SidebarItem,
  SidebarItemBadge,
  SidebarItemTooltip,
} from '../../../components/sidebar';
import { useHomeSelected } from '../../../hooks/router/useHomeSelected';
import { UnreadBadge } from '../../../components/unread-badge';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';
import { useNavToActivePathAtom } from '../../../state/hooks/navToActivePath';
import { useHomeRooms } from '../home/useHomeRooms';
import { markAsRead } from '../../../utils/notifications';
import { stopPropagation } from '../../../utils/keyboard';
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
import { useRoomsUnread } from '../../../state/hooks/unread';
import { unreadRoomsAtom } from '../../../state/room/roomToUnread';

type HomeMenuProps = {
  homeRooms: string[];
  roomToNotifications: RoomToNotifications;
  notifications: TotalNotifications;
  requestClose: () => void;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(
  ({ homeRooms, roomToNotifications, notifications, requestClose }, ref) => {
    const [hideActivity] = useSetting('hideActivity');

    const handleMarkAsRead = () => {
      homeRooms.forEach((rId) => {
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

export function HomeTab() {
  const navigate = useNavigate();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());

  const homeRooms = useHomeRooms();
  const roomsNotifications = useRoomsNotifications(homeRooms, roomToNotificationsAtom);
  const notifications = useRoomsTotalNotifications(roomsNotifications);
  const unreadRooms = useRoomsUnread(homeRooms, unreadRoomsAtom);
  const unreadOrNotification = (notifications && notifications.count > 0) || unreadRooms.size > 0;

  const homeSelected = useHomeSelected();
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleHomeClick = () => {
    const activePath = navToActivePath.get('home');
    if (activePath && screenSize !== ScreenSize.Mobile) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getHomePath());
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
    <SidebarItem active={homeSelected}>
      <SidebarItemTooltip tooltip="Home">
        {(triggerRef) => (
          <SidebarAvatar
            as="button"
            ref={triggerRef}
            outlined
            onClick={handleHomeClick}
            onContextMenu={handleContextMenu}
          >
            <Icon src={Icons.Home} filled={homeSelected} />
          </SidebarAvatar>
        )}
      </SidebarItemTooltip>
      {unreadOrNotification && (
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
              <HomeMenu
                homeRooms={homeRooms}
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
