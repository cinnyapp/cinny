import React, { MouseEventHandler, forwardRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config, toRem } from 'folds';
import { useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { useOrphanRooms } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { mDirectAtom } from '../../../state/mDirectList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToUnreadAtom } from '../../../state/room/roomToUnread';
import { getHomePath, joinPathComponent } from '../../pathUtils';
import { useRoomsUnread } from '../../../state/hooks/unread';
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
import { markAsRead } from '../../../../client/action/notifications';
import { stopPropagation } from '../../../utils/keyboard';

type HomeMenuProps = {
  requestClose: () => void;
};
const HomeMenu = forwardRef<HTMLDivElement, HomeMenuProps>(({ requestClose }, ref) => {
  const orphanRooms = useHomeRooms();
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

export function HomeTab() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const screenSize = useScreenSizeContext();
  const navToActivePath = useAtomValue(useNavToActivePathAtom());

  const mDirects = useAtomValue(mDirectAtom);
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanRooms = useOrphanRooms(mx, allRoomsAtom, mDirects, roomToParents);
  const homeUnread = useRoomsUnread(orphanRooms, roomToUnreadAtom);
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
      {homeUnread && (
        <SidebarItemBadge hasCount={homeUnread.total > 0}>
          <UnreadBadge highlight={homeUnread.highlight > 0} count={homeUnread.total} />
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
              <HomeMenu requestClose={() => setMenuAnchor(undefined)} />
            </FocusTrap>
          }
        />
      )}
    </SidebarItem>
  );
}
