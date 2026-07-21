import { Chip, config, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text } from 'folds';
import React, { MouseEventHandler, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { isKeyHotkey } from 'is-hotkey';
import { useRoomCreatorsTag } from '../../hooks/useRoomCreatorsTag';
import { PowerColorBadge, PowerIcon } from '../power';
import { getPowerTagIconSrc } from '../../hooks/useMemberPowerTag';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { stopPropagation } from '../../utils/keyboard';
import { useRoom } from '../../hooks/useRoom';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { useOpenRoomSettings } from '../../state/hooks/roomSettings';
import { useOpenSpaceSettings } from '../../state/hooks/spaceSettings';
import { SpaceSettingsPage } from '../../state/spaceSettings';
import { RoomSettingsPage } from '../../state/roomSettings';
import { useClient } from '../../hooks/useClient';

export function CreatorChip() {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const roomId = useRoom();
  const spaceId = useSpaceOptionally();
  const openRoomSettings = useOpenRoomSettings();
  const openSpaceSettings = useOpenSpaceSettings();

  const [cords, setCords] = useState<RectCords>();
  const tag = useRoomCreatorsTag();
  const tagIconSrc = tag.icon && getPowerTagIconSrc(ct, useAuthentication, tag.icon);

  const open: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCords(evt.currentTarget.getBoundingClientRect());
  };

  const close = () => setCords(undefined);

  return (
    <PopOut
      anchor={cords}
      position="Bottom"
      align="Start"
      offset={4}
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
            isKeyForward: (evt: KeyboardEvent) => isKeyHotkey('arrowdown', evt),
            isKeyBackward: (evt: KeyboardEvent) => isKeyHotkey('arrowup', evt),
          }}
        >
          <Menu>
            <div style={{ padding: config.space.S100 }}>
              <MenuItem
                variant="Surface"
                fill="None"
                size="300"
                radii="300"
                onClick={() => {
                  if (ct.spaceRooms.read.has(roomId)) {
                    openSpaceSettings(roomId, spaceId, SpaceSettingsPage.PermissionsPage);
                  } else {
                    openRoomSettings(roomId, spaceId, RoomSettingsPage.PermissionsPage);
                  }
                  close();
                }}
              >
                <Text size="B300">Manage Powers</Text>
              </MenuItem>
            </div>
          </Menu>
        </FocusTrap>
      }
    >
      <Chip
        variant="Success"
        outlined
        radii="Pill"
        before={
          cords ? (
            <Icon size="50" src={Icons.ChevronBottom} />
          ) : (
            <PowerColorBadge color={tag.color} />
          )
        }
        after={tagIconSrc ? <PowerIcon size="50" iconSrc={tagIconSrc} /> : undefined}
        onClick={open}
        aria-pressed={!!cords}
      >
        <Text size="B300" truncate>
          {tag.name}
        </Text>
      </Chip>
    </PopOut>
  );
}
