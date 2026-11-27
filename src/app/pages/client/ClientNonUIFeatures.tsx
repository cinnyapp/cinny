/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { useNavigate } from 'react-router-dom';
import { useSetting } from '../../state/hooks/settings';
import { unreadRoomsAtom } from '../../state/room/roomToUnread';
import { roomToNotificationsAtom } from '../../state/room/roomToNotifications';
import { notificationPermission, setFavicon } from '../../utils/dom';
import LogoSVG from '../../../../public/res/svg/cinny.svg';
import LogoUnreadSVG from '../../../../public/res/svg/cinny-unread.svg';
import LogoHighlightSVG from '../../../../public/res/svg/cinny-highlight.svg';
import { getRoomsTotalNotifications } from '../../state/hooks/roomNotifications';
import { useClient } from '../../hooks/useClient';
import { getInboxInvitesPath } from '../pathUtils';
import InviteSound from '../../../../public/sound/invite.ogg';
import { useSound } from '../../hooks/useSound';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting('twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function PageZoomFeature() {
  const [pageZoom] = useSetting('pageZoom');

  if (pageZoom === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.setProperty('font-size', `calc(1em * ${pageZoom / 100})`);
  }

  return null;
}

function FaviconUpdater() {
  const unreadRooms = useAtomValue(unreadRoomsAtom);
  const roomToNotifications = useAtomValue(roomToNotificationsAtom);

  const notificaitonCount = useMemo(() => {
    const total = getRoomsTotalNotifications(roomToNotifications);
    return total;
  }, [roomToNotifications]);

  useEffect(() => {
    if (unreadRooms || notificaitonCount.count > 0) {
      setFavicon(notificaitonCount.highlight ? LogoHighlightSVG : LogoUnreadSVG);
    } else {
      setFavicon(LogoSVG);
    }
  }, [unreadRooms, notificaitonCount]);

  return null;
}

function InviteNotifications() {
  const ct = useClient();
  const navigate = useNavigate();

  const { play } = useSound(InviteSound);

  const prevInviteCount = useRef(0);

  const [showNotifications] = useSetting('showNotifications');
  const [notificationSound] = useSetting('isNotificationSounds');

  const notify = useCallback(
    (count: number) => {
      const noti = new window.Notification('Invitation', {
        icon: LogoSVG,
        badge: LogoSVG,
        body: `You have ${count} new invitation request.`,
        silent: true,
      });

      noti.onclick = () => {
        if (!window.closed) navigate(getInboxInvitesPath());
        noti.close();
      };
    },
    [navigate]
  );

  useEffect(() => {
    const unsub = ct.rooms.invite.subscribe((invites) => {
      const prevCount = prevInviteCount.current;

      if (invites.length > prevCount) {
        if (showNotifications && notificationPermission('granted')) {
          notify(invites.length - prevCount);
        }

        if (notificationSound) {
          play();
        }
      }

      prevInviteCount.current = invites.length;
    });

    return unsub;
  }, [ct, showNotifications, notificationSound, notify, play]);

  return null;
}

export function ClientNonUIFeatures() {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
      <FaviconUpdater />
      <InviteNotifications />
    </>
  );
}
