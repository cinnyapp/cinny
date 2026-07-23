import React, { ReactNode, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  config,
  Icon,
  Icons,
  Modal,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
} from 'folds';
import classNames from 'classnames';
import FocusTrap from 'focus-trap-react';
import Linkify from 'linkify-react';
import * as css from './styles.css';
import { UserAvatar } from '../user-avatar';
import colorMXID from '../../../util/colorMXID';
import { getMxIdLocalPart } from '../../utils/matrix';
import { BreakWord, LineClamp3 } from '../../styles/Text.css';
import { UserPresence } from '../../hooks/useUserPresence';
import { AvatarPresence, PresenceBadge } from '../presence';
import { ImageViewer } from '../image-viewer';
import { stopPropagation } from '../../utils/keyboard';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { UserBiography, UserPronoun } from '../../hooks/useUserProfile';

export function UserHero({ children }: { children: ReactNode }) {
  return (
    <Box direction="Column" className={css.UserHero}>
      {children}
    </Box>
  );
}

export function UserHeroCover({
  userId,
  avatarUrl,
  bannerUrl,
  hasStatus,
}: {
  userId: string;
  avatarUrl?: string;
  bannerUrl?: string;
  hasStatus: boolean;
}) {
  return (
    <div
      className={css.UserHeroCoverContainer}
      style={{
        backgroundColor: colorMXID(userId),
        filter: bannerUrl && !hasStatus ? undefined : 'brightness(50%)',
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
  );
}
type UserHeroAvatarProps = {
  userId: string;
  avatarUrl?: string;
  presence?: UserPresence;
};
export function UserHeroAvatar({ userId, avatarUrl, presence }: UserHeroAvatarProps) {
  const [viewAvatar, setViewAvatar] = useState<string>();

  const { status } = presence ?? {};

  return (
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
            <Text title={status} className={classNames(BreakWord, LineClamp3)} size="T200">
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
  );
}

export function UserTimezone({ timezone }: { timezone: string }) {
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');

  let time: string | undefined;
  let offset: string | undefined;

  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: !hour24Clock,
      timeZoneName: 'shortOffset',
    }).formatToParts(new Date());

    time = parts
      .filter((p) => (p.type !== 'timeZoneName' && p.type !== 'literal') || p.type === 'literal')
      .map((p) => p.value)
      .join('')
      .trim();

    offset = parts.find((p) => p.type === 'timeZoneName')?.value; // e.g. "GMT+5:30"
  } catch (e) {
    console.error(e);
  }

  return (
    <Box as="span" alignItems="Center" gap="100">
      <Icon style={{ opacity: config.opacity.P300 }} size="50" src={Icons.Clock} />
      <Text as="span" size="T200" priority="300" truncate>
        {time} local time · {timezone}
        {offset ? ` (${offset})` : ''}
      </Text>
    </Box>
  );
}

type UserHeroNameProps = {
  displayName?: string;
  userId: string;
  pronouns?: UserPronoun[];
};
export function UserHeroName({ displayName, userId, pronouns }: UserHeroNameProps) {
  const username = getMxIdLocalPart(userId);

  return (
    <Box grow="Yes" direction="Column" gap="100">
      <Box alignItems="Center" gap="100" wrap="Wrap">
        <Text
          size="H4"
          className={classNames(BreakWord, LineClamp3)}
          title={displayName ?? username}
        >
          {displayName ?? username ?? userId}
        </Text>
      </Box>
      <Box alignItems="Center" gap="200" wrap="Wrap">
        <Text size="T200" className={classNames(BreakWord, LineClamp3)} title={username}>
          @{username}
        </Text>
        {pronouns?.map((pronoun) =>
          pronoun.summary ? (
            <Badge key={pronoun.summary} variant="Primary" fill="Soft" size="400">
              <Text size="L400" truncate>
                {pronoun.summary}
              </Text>
            </Badge>
          ) : undefined
        )}
      </Box>
    </Box>
  );
}

export function UserHeroBiography({ bio }: { bio: UserBiography }) {
  return (
    <Text className={classNames(BreakWord, LineClamp3)} size="T200">
      <Linkify options={LINKIFY_OPTS}>{bio.body}</Linkify>
    </Text>
  );
}
