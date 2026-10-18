import React, { MouseEventHandler, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Chip,
  config,
  Icon,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Text,
  toRem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import * as css from './styles.css';
import { stopPropagation } from '../../utils/keyboard';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { UserAvatar } from '../../components/user-avatar';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { getMouseEventCords } from '../../utils/dom';
import { useClient } from '../../hooks/useClient';
import { RoomMembersAPI } from '../../hooks/useRoomMembers';
import { mxcToHttp } from '../../../client/mxcToHttp';

type LiveChipProps = {
  roomId: string;
  users: string[];
  count: number;
  membersAPI: RoomMembersAPI;
};
export function LiveChip({ count, roomId, users, membersAPI }: LiveChipProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const openUserProfile = useOpenUserRoomProfile();

  const [cords, setCords] = useState<RectCords>();

  const handleOpenMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <PopOut
      anchor={cords}
      position="Top"
      align="Start"
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
          <Menu
            style={{
              maxHeight: '75vh',
              maxWidth: toRem(300),
              display: 'flex',
            }}
          >
            <Box grow="Yes">
              <Scroll size="0" hideTrack visibility="Hover">
                <Box direction="Column" style={{ padding: config.space.S100 }}>
                  {users.map((userId) => {
                    if (!userId) return null;
                    const name = membersAPI.getName(userId);
                    const avatarMxc = membersAPI.getAvatar(userId);
                    const avatarUrl = avatarMxc
                      ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
                          width: 96,
                          height: 96,
                        })
                      : undefined;

                    return (
                      <MenuItem
                        key={userId}
                        size="400"
                        variant="Surface"
                        radii="300"
                        style={{ paddingLeft: config.space.S200 }}
                        onClick={(evt) =>
                          openUserProfile(
                            roomId,
                            undefined,
                            userId,
                            getMouseEventCords(evt.nativeEvent),
                            'Right'
                          )
                        }
                        before={
                          <Avatar size="200" radii="400">
                            <UserAvatar
                              userId={userId}
                              src={avatarUrl}
                              alt={name}
                              renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                            />
                          </Avatar>
                        }
                      >
                        <Text size="T300" truncate>
                          {name}
                        </Text>
                      </MenuItem>
                    );
                  })}
                </Box>
              </Scroll>
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant="Surface"
        fill="Soft"
        before={<Badge variant="Critical" fill="Solid" size="200" />}
        after={<Icon size="50" src={cords ? Icons.ChevronBottom : Icons.ChevronTop} />}
        radii="Pill"
        onClick={handleOpenMenu}
      >
        <Text className={css.LiveChipText} as="span" size="L400" truncate>
          {count} Live
        </Text>
      </Chip>
    </PopOut>
  );
}
