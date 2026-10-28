import React, { useMemo } from 'react';
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
import * as css from './EventReaders.css';
import { UserAvatar } from '../user-avatar';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../state/hooks/userRoomProfile';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getMouseEventCords } from '../../utils/dom';
import { useClient } from '../../hooks/useClient';
import { useObservableValuePromise } from '../../hooks/useObservableValue';
import { useRoomMembersAPI } from '../../hooks/useRoomMembers';
import { mxcToHttp } from '../../../client/mxcToHttp';
import { useRoom } from '../../hooks/useRoom';
import { Time } from '../message';
import { useSettings } from '../../state/hooks/settings';

export type EventReadersProps = {
  eventId: string;
  requestClose: () => void;
};
export const EventReaders = as<'div', EventReadersProps>(
  ({ className, eventId, requestClose, ...props }, ref) => {
    const ct = useClient();
    const roomId = useRoom();
    const membersAPI = useRoomMembersAPI();
    const { hour24Clock, dateFormatString } = useSettings();

    const eventReceipt = useObservableValuePromise(
      useMemo(
        () => ct.storage.readReceipt.observableRead.queryIndex('eventId', eventId),
        [ct, eventId]
      )
    );

    const useAuthentication = useMediaAuthentication();
    const openProfile = useOpenUserRoomProfile();
    const spaceId = useSpaceOptionally();

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
              {Array.from(eventReceipt.value ?? [])
                .sort((a, b) => b.ts - a.ts)
                ?.map((receipt) => {
                  const { userId, ts } = receipt;
                  const name = membersAPI.getName(userId);
                  const avatarMxcUrl = membersAPI.getAvatar(userId);
                  const avatarUrl = avatarMxcUrl
                    ? mxcToHttp(ct.session.baseUrl, avatarMxcUrl, useAuthentication).thumbnail({
                        width: 96,
                        height: 96,
                        method: 'crop',
                      })
                    : undefined;

                  return (
                    <MenuItem
                      key={`${userId}${ts}`}
                      style={{ padding: `0 ${config.space.S200}` }}
                      radii="400"
                      onClick={(event) => {
                        openProfile(
                          roomId,
                          spaceId,
                          userId,
                          getMouseEventCords(event.nativeEvent),
                          'Bottom'
                        );
                      }}
                      before={
                        <Avatar size="200">
                          <UserAvatar
                            userId={userId}
                            src={avatarUrl ?? undefined}
                            alt={name}
                            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
                          />
                        </Avatar>
                      }
                      after={
                        <Time
                          hour24Clock={hour24Clock}
                          dateFormatString={dateFormatString}
                          ts={ts}
                        />
                      }
                    >
                      <Text style={{ flexGrow: 1 }} size="T400" truncate>
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
