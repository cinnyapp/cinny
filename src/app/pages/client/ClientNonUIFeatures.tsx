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
import { getInboxInvitesPath, getInboxNotificationsPath } from '../pathUtils';
import InviteSound from '../../../../public/sound/invite.ogg';
import NotificationSound from '../../../../public/sound/notification.ogg';
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

  const prevInviteCount = useRef(ct.rooms.invite.read.length);

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
    const handleInvite = (invites: string[]) => {
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
    };
    const unsub = ct.rooms.invite.subscribe(handleInvite);

    return unsub;
  }, [ct, showNotifications, notificationSound, notify, play]);

  return null;
}

function MessageNotifications() {
  const ct = useClient();
  const navigate = useNavigate();
  const notifRef = useRef<Notification>();

  const { play } = useSound(NotificationSound);

  const roomToNotifications = useAtomValue(roomToNotificationsAtom);

  const notifications = useMemo(
    () => getRoomsTotalNotifications(roomToNotifications),
    [roomToNotifications]
  );

  const prevNotificationCount = useRef(notifications.count);

  const [showNotifications] = useSetting('showNotifications');
  const [notificationSound] = useSetting('isNotificationSounds');

  const notify = useCallback(
    (total: number) => {
      const noti = new window.Notification(total === 1 ? 'New message' : `${total} new messages`, {
        icon: LogoSVG,
        badge: LogoSVG,
        body: 'You have unread notifications in Cinny.',
        silent: true,
        tag: 'cinny-messages',
      });

      noti.onclick = () => {
        if (!window.closed) navigate(getInboxNotificationsPath());
        noti.close();
        notifRef.current = undefined;
      };

      notifRef.current?.close();
      notifRef.current = noti;
    },
    [navigate]
  );

  useEffect(() => {
    const previousCount = prevNotificationCount.current;
    if (document.hasFocus()) return;

    if (notifications.count > previousCount) {
      if (notificationSound) {
        play();
      }

      if (showNotifications && Notification.permission === 'granted') {
        notify(notifications.count);
      }
    }

    prevNotificationCount.current = notifications.count;
  }, [notifications, notificationSound, showNotifications, ct, notify, play]);

  return null;
}

export function ClientNonUIFeatures() {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
      <FaviconUpdater />
      <InviteNotifications />
      <MessageNotifications />
    </>
  );
}
