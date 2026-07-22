import React, { useState } from 'react';
import {
  Avatar,
  Box,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  Tooltip,
  TooltipProvider,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import Linkify from 'linkify-react';
import * as css from './styles.css';
import { UserAvatar } from '../user-avatar';
import colorMXID from '../../../util/colorMXID';
import { getMxIdLocalPart } from '../../utils/matrix';
import { BreakWord, DotDivider, HoverUnderline, LineClamp3 } from '../../styles/Text.css';
import { UserPresence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../presence';
import { ImageViewer } from '../image-viewer';
import { stopPropagation } from '../../utils/keyboard';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';

type UserHeroProps = {
  userId: string;
  avatarUrl?: string;
  bannerUrl?: string;
  presence?: UserPresence;
};
export function UserHero({ userId, avatarUrl, bannerUrl, presence }: UserHeroProps) {
  const [viewAvatar, setViewAvatar] = useState<string>();

  const { status } = presence ?? {};

  return (
    <Box direction="Column" className={css.UserHero}>
      <div
        className={css.UserHeroCoverContainer}
        style={{
          backgroundColor: colorMXID(userId),
          filter: bannerUrl && !status ? undefined : 'brightness(50%)',
        }}
      >
        {bannerUrl && (
          <img
            className={classNames(
              css.UserHeroCover,
              avatarUrl === bannerUrl && css.UserHeroCoverBlurred
            )}
            src={bannerUrl}
            alt={userId}
            draggable="false"
          />
        )}
      </div>
      <div className={css.UserHeroAvatarContainer}>
        <AvatarPresence
          className={css.UserAvatarContainer}
          badge={presence && <PresenceBadge presence={presence.presence} />}
        >
          <Avatar
            as={avatarUrl ? 'button' : 'div'}
            onClick={avatarUrl ? () => setViewAvatar(avatarUrl) : undefined}
            className={css.UserHeroAvatar}
            size="500"
          >
            <UserAvatar
              className={css.UserHeroAvatarImg}
              userId={userId}
              src={avatarUrl}
              alt={userId}
              renderFallback={() => <Icon size="500" src={Icons.User} filled />}
            />
          </Avatar>
        </AvatarPresence>
        {status && (
          <div className={css.UserHeroStatus}>
            <div className={css.UserHeroStatusContent}>
              <Text className={classNames(BreakWord, LineClamp3)} size="T200">
                <Linkify options={LINKIFY_OPTS}>{status}</Linkify>
              </Text>
            </div>
          </div>
        )}
        {viewAvatar && (
          <Overlay open backdrop={<OverlayBackdrop />}>
            <OverlayCenter>
              <FocusTrap
                focusTrapOptions={{
                  initialFocus: false,
                  onDeactivate: () => setViewAvatar(undefined),
                  clickOutsideDeactivates: true,
                  escapeDeactivates: stopPropagation,
                }}
              >
                <Modal size="500" onContextMenu={(evt: any) => evt.stopPropagation()}>
                  <ImageViewer
                    src={viewAvatar}
                    alt={userId}
                    requestClose={() => setViewAvatar(undefined)}
                  />
                </Modal>
              </FocusTrap>
            </OverlayCenter>
          </Overlay>
        )}
      </div>
    </Box>
  );
}

export function UserTimezone({ timezone }: { timezone: string }) {
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  const time = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: !hour24Clock,
  }).format(new Date());

  return (
    <TooltipProvider
      position="Top"
      offset={0}
      tooltip={
        <Tooltip>
          <Text size="L400">{timezone}</Text>
        </Tooltip>
      }
    >
      {(triggerRef) => (
        <Text as="span" ref={triggerRef} className={HoverUnderline} size="T200" priority="300">
          {time}
        </Text>
      )}
    </TooltipProvider>
  );
}

type UserHeroNameProps = {
  displayName?: string;
  userId: string;
  timezone?: string;
};
export function UserHeroName({ displayName, userId, timezone }: UserHeroNameProps) {
  const username = getMxIdLocalPart(userId);

  return (
    <Box grow="Yes" direction="Column" gap="100">
      <Box alignItems="Baseline" gap="200" wrap="Wrap">
        <Text
          size="H4"
          className={classNames(BreakWord, LineClamp3)}
          title={displayName ?? username}
        >
          {displayName ?? username ?? userId}
        </Text>
      </Box>
      <Box alignItems="Center" gap="100" wrap="Wrap">
        <Text size="T200" className={classNames(BreakWord, LineClamp3)} title={username}>
          @{username}
        </Text>
        {timezone && <span className={DotDivider} />}
        {timezone && <UserTimezone timezone={timezone} />}
      </Box>
    </Box>
  );
}
