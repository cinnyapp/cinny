import React, { useCallback } from 'react';
import { Box, Text, Switch, Button, color, Spinner } from 'folds';
import { IPusherRequest } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import i18next from 'i18next';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { getNotificationState, usePermissionState } from '../../../hooks/usePermission';
import { useEmailNotifications } from '../../../hooks/useEmailNotifications';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';

function EmailNotification() {
  const { t } = useTranslation('settingsNotifications');
  const mx = useMatrixClient();
  const [result, refreshResult] = useEmailNotifications();

  const [setState, setEnable] = useAsyncCallback(
    useCallback(
      async (email: string, enable: boolean) => {
        if (enable) {
          const emailNotificationsName = t('emailNotificationsDisplayName', {
            defaultValue: 'Email Notifications',
          });
          await mx.setPusher({
            kind: 'email',
            app_id: 'm.email',
            pushkey: email,
            app_display_name: emailNotificationsName,
            device_display_name: email,
            lang: i18next.language ?? 'en',
            data: {
              brand: 'Cinny',
            },
            append: true,
          });
          return;
        }
        await mx.setPusher({
          pushkey: email,
          app_id: 'm.email',
          kind: null,
        } as unknown as IPusherRequest);
      },
      [mx]
    )
  );

  const handleChange = (value: boolean) => {
    if (result && result.email) {
      setEnable(result.email, value).then(() => {
        refreshResult();
      });
    }
  };

  return (
    <SettingTile
      title={t('emailNotificationTitle', { defaultValue: 'Email Notification' })}
      description={
        <>
          {result && !result.email && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              {t('noEmailAttached', {
                defaultValue: 'Your account does not have any email attached.',
              })}
            </Text>
          )}
          {result && result.email && (
            <>
              {t('sendToEmail', {
                defaultValue: 'Send notification to your email. ("{{email}}")',
                email: result.email,
              })}
            </>
          )}
          {result === null && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              {t('unexpectedError', { defaultValue: 'Unexpected Error!' })}
            </Text>
          )}
          {result === undefined &&
            t('sendToEmailGeneric', { defaultValue: 'Send notification to your email.' })}
        </>
      }
      after={
        <>
          {setState.status !== AsyncStatus.Loading &&
            typeof result === 'object' &&
            result?.email && <Switch value={result.enabled} onChange={handleChange} />}
          {(setState.status === AsyncStatus.Loading || result === undefined) && (
            <Spinner variant="Secondary" />
          )}
        </>
      }
    />
  );
}

export function SystemNotification() {
  const { t } = useTranslation('settingsNotifications');
  const notifPermission = usePermissionState('notifications', getNotificationState());
  const [showNotifications, setShowNotifications] = useSetting(settingsAtom, 'showNotifications');
  const [isNotificationSounds, setIsNotificationSounds] = useSetting(
    settingsAtom,
    'isNotificationSounds'
  );

  const requestNotificationPermission = () => {
    window.Notification.requestPermission();
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">{t('systemHeader', { defaultValue: 'System' })}</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('desktopNotificationsTitle', { defaultValue: 'Desktop Notifications' })}
          description={
            notifPermission === 'denied' ? (
              <Text as="span" style={{ color: color.Critical.Main }} size="T200">
                {'Notification' in window
                  ? t('permissionBlocked', {
                      defaultValue:
                        'Notification permission is blocked. Please allow notification permission from browser address bar.',
                    })
                  : t('notificationsNotSupported', {
                      defaultValue: 'Notifications are not supported by the system.',
                    })}
              </Text>
            ) : (
              <span>
                {t('desktopNotificationsDescription', {
                  defaultValue: 'Show desktop notifications when message arrive.',
                })}
              </span>
            )
          }
          after={
            notifPermission === 'prompt' ? (
              <Button size="300" radii="300" onClick={requestNotificationPermission}>
                <Text size="B300">{t('enable', { defaultValue: 'Enable' })}</Text>
              </Button>
            ) : (
              <Switch
                disabled={notifPermission !== 'granted'}
                value={showNotifications}
                onChange={setShowNotifications}
              />
            )
          }
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('notificationSoundTitle', { defaultValue: 'Notification Sound' })}
          description={t('notificationSoundDescription', {
            defaultValue: 'Play sound when new message arrive.',
          })}
          after={<Switch value={isNotificationSounds} onChange={setIsNotificationSounds} />}
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <EmailNotification />
      </SequenceCard>
    </Box>
  );
}
