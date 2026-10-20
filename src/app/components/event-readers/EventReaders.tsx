import React from 'react';
import classNames from 'classnames';
import {
  Avatar,
  Box,
  Header,
  Icon,
  IconButton,
  Icons,
  MenuItem,
  Scroll,
  Text,
  as,
  config,
} from 'folds';
import { Room } from 'matrix-js-sdk';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './EventReaders.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { UserAvatar, UserInitials } from '../user-avatar';
import { getSenderAvatar } from '../../hooks/useSenderAvatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getMouseEventCords } from '../../utils/dom';

export type EventReadersProps = {
  room: Room;
  eventId: string;
  requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
  ({ className, room, eventId, requestClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const useAuthentication = useMediaAuthentication();
    const latestEventReaders = useRoomEventReaders(room, eventId);
    const openProfile = useOpenUserRoomProfile();
    const space = useSpaceOptionally();

    const getName = (userId: string) =>
      getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

    return (
      <Box
        className={classNames(css.EventReaders, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.Header} variant="Surface" size="600">
          <Box grow="Yes">
            <Text size="H3">Seen by</Text>
          </Box>
          <IconButton size="300" onClick={requestClose}>
            <Icon src={Icons.Cross} />
          </IconButton>
        </Header>
        <Box grow="Yes">
          <Scroll visibility="Hover" hideTrack size="300">
            <Box className={css.Content} direction="Column">
              {latestEventReaders.map((readerId) => {
                const name = getName(readerId);
                const avatar = getSenderAvatar(mx, room, readerId, useAuthentication, 100);

                return (
                  <MenuItem
                    key={readerId}
                    style={{ padding: `0 ${config.space.S200}` }}
                    radii="400"
                    onClick={(event) => {
                      openProfile(
                        room.roomId,
                        space?.roomId,
                        readerId,
                        getMouseEventCords(event.nativeEvent),
                        'Bottom'
                      );
                    }}
                    before={
                      <Avatar size="200">
                        <UserAvatar
                          userId={readerId}
                          src={avatar.src}
                          fallbackSrc={avatar.fallbackSrc}
                          alt={name}
                          renderFallback={() => <UserInitials name={name} size="T200" />}
                        />
                      </Avatar>
                    }
                  >
                    <Text size="T400" truncate>
                      {name}
                    </Text>
                  </MenuItem>
                );
              })}
            </Box>
          </Scroll>
        </Box>
      </Box>
    );
  }
);
