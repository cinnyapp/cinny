import React from 'react';
import { Avatar, Box, Icon, IconButton, Icons, Text, Tooltip, TooltipProvider } from 'folds';
import { PageHeader } from '../../components/page';
import { useSetSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useRoomAvatar, useRoomName } from '../../hooks/useRoomMeta';
import { useSpace } from '../../hooks/useSpace';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import * as css from './LobbyHeader.css';
import { openSpaceSettings } from '../../../client/action/navigation';

type LobbyHeaderProps = {
  showProfile?: boolean;
};
export function LobbyHeader({ showProfile }: LobbyHeaderProps) {
  const mx = useMatrixClient();
  const space = useSpace();
  const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

  const name = useRoomName(space);
  const avatarMxc = useRoomAvatar(space);
  const avatarUrl = avatarMxc ? mx.mxcUrlToHttp(avatarMxc, 96, 96, 'crop') ?? undefined : undefined;

  return (
    <PageHeader className={showProfile ? undefined : css.Header}>
      <Box grow="Yes" alignItems="Center" gap="200">
        <Box grow="Yes" basis="No" />
        <Box justifyContent="Center" alignItems="Center" gap="300">
          {showProfile && (
            <>
              <Avatar size="300">
                <RoomAvatar
                  src={avatarUrl}
                  alt={name}
                  renderFallback={() => <Text size="H4">{nameInitials(name)}</Text>}
                />
              </Avatar>
              <Text size="H3" truncate>
                {name}
              </Text>
            </>
          )}
        </Box>
        <Box shrink="No" grow="Yes" basis="No" justifyContent="End">
          <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>Members</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton ref={triggerRef} onClick={() => setPeopleDrawer((drawer) => !drawer)}>
                <Icon size="400" src={Icons.User} />
              </IconButton>
            )}
          </TooltipProvider>
          <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>Settings</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton ref={triggerRef} onClick={() => openSpaceSettings(space.roomId)}>
                <Icon size="400" src={Icons.Setting} />
              </IconButton>
            )}
          </TooltipProvider>
        </Box>
      </Box>
    </PageHeader>
  );
}
