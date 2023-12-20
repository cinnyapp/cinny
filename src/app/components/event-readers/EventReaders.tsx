import React from 'react';
import classNames from 'classnames';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
import { useTranslation } from 'react-i18next';
import { useRoomEventReaders } from '../../hooks/useRoomEventReaders';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './EventReaders.css';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import colorMXID from '../../../util/colorMXID';
import { openProfileViewer } from '../../../client/action/navigation';

export type EventReadersProps = {
  room: Room;
  eventId: string;
  requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
  ({ className, room, eventId, requestClose, ...props }, ref) => {
    const mx = useMatrixClient();
    const latestEventReaders = useRoomEventReaders(room, eventId);

    const getName = (userId: string) =>
      getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId) ?? userId;

    const { t } = useTranslation();

    return (
      <Box
        className={classNames(css.EventReaders, className)}
        direction="Column"
        {...props}
        ref={ref}
      >
        <Header className={css.Header} variant="Surface" size="600">
          <Box grow="Yes">
            <Text size="H3">{t('Components.EventReaders.seen_by')}</Text>
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
                const avatarUrl = room
                  .getMember(readerId)
                  ?.getAvatarUrl(mx.baseUrl, 100, 100, 'crop', undefined, false);

                return (
                  <MenuItem
                    key={readerId}
                    style={{ padding: `0 ${config.space.S200}` }}
                    radii="400"
                    onClick={() => {
                      requestClose();
                      openProfileViewer(readerId, room.roomId);
                    }}
                    before={
                      <Avatar size="200">
                        {avatarUrl ? (
                          <AvatarImage src={avatarUrl} />
                        ) : (
                          <AvatarFallback
                            style={{
                              background: colorMXID(readerId),
                              color: 'white',
                            }}
                          >
                            <Text size="H6">{name[0]}</Text>
                          </AvatarFallback>
                        )}
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
