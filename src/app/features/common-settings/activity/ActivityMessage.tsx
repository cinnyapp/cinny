/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ClientEventWithoutRoomId } from 'neurone/lib/api/types';
import React, { MouseEventHandler, ReactNode } from 'react';
import { Box, Text, Icon, IconSrc, MainColor, color, Avatar, Icons } from 'folds';
import { useRoomMembersAPI } from '../../../hooks/useRoomMembers';
import { Time, Username, UsernameBold } from '../../../components/message';
import { BreakWord } from '../../../styles/Text.css';
import * as css from './styles.css';
import { useSettings } from '../../../state/hooks/settings';
import { UserAvatar } from '../../../components/user-avatar';
import { mxcToHttp } from '../../../../client/mxcToHttp';
import { useClient } from '../../../hooks/useClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { useOpenUserRoomProfile } from '../../../state/hooks/userRoomProfile';
import { useRoom } from '../../../hooks/useRoom';
import { useSpaceOptionally } from '../../../hooks/useSpace';

type ActivityMessageProps = {
  event: ClientEventWithoutRoomId;
  userId?: string;
  variant: MainColor;
  iconSrc: IconSrc;
  text: ReactNode;
  children?: ReactNode;
  getUsernameColor: (userId: string) => string | undefined;
};

export function ActivityMessage({
  event,
  userId = event.sender,
  variant,
  iconSrc,
  text,
  children,
  getUsernameColor,
}: ActivityMessageProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const { hour24Clock, dateFormatString } = useSettings();
  const memberAPI = useRoomMembersAPI();

  const roomId = useRoom();
  const spaceId = useSpaceOptionally();

  const openProfile = useOpenUserRoomProfile();

  const displayName = memberAPI.getName(userId);
  const avatarMxc = memberAPI.getAvatar(userId);

  const usernameColor = getUsernameColor(userId);

  const handleUsernameClick: MouseEventHandler<HTMLButtonElement> = (e) => {
    const cords = e.currentTarget.getBoundingClientRect();
    openProfile(roomId, spaceId, userId, cords);
  };

  return (
    <Box className={css.ActivityMessage} grow="Yes" gap="200" alignItems="Start">
      <Box style={{ position: 'relative' }} shrink="No" alignItems="Center" gap="200">
        <Box
          className={css.ActivityIcon}
          style={{
            background: color[variant].Container,
            color: color[variant].OnContainer,
          }}
        >
          <Icon size="50" src={iconSrc} filled />
        </Box>
        <Avatar size="200" radii="Pill">
          <UserAvatar
            userId={event.sender}
            src={
              avatarMxc
                ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
                    width: 96,
                    height: 96,
                    method: 'crop',
                  })
                : undefined
            }
            alt={displayName}
            renderFallback={() => <Icon size="50" src={Icons.User} filled />}
          />
        </Avatar>
      </Box>
      <Box className={css.ActivityMessageContent} grow="Yes" direction="Column">
        <Box gap="200" alignItems="Baseline">
          <Box grow="Yes" direction="Column">
            <Text className={BreakWord} size="T300" as="p">
              <Username
                as="button"
                data-user-id={userId}
                onClick={handleUsernameClick}
                style={{ color: usernameColor }}
              >
                <UsernameBold>{displayName}</UsernameBold>
              </Username>{' '}
              {text}
            </Text>
          </Box>
          <Time
            compact
            ts={event.origin_server_ts}
            hour24Clock={hour24Clock}
            dateFormatString={dateFormatString}
          />
        </Box>
        {children}
      </Box>
    </Box>
  );
}
