import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Box, Text, Switch, Button, color, Spinner } from 'folds';
import { IPusherRequest } from 'matrix-js-sdk';
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
  const mx = useMatrixClient();
  const [result, refreshResult] = useEmailNotifications();

  // Keep a stable reference of the last successful result to prevent UI flickering
  const stableResultRef = useRef(result);
  const stableResult = useMemo(() => {
    if (result !== undefined) return result;
    return stableResultRef.current;
  }, [result]);
  useEffect(() => {
    if (result !== undefined) stableResultRef.current = result;
  }, [result]);

  const [optimisticEnabled, setOptimisticEnabled] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    if (stableResult != null) setOptimisticEnabled(stableResult.enabled);
  }, [stableResult]);

  const [updateState, setEnable] = useAsyncCallback(
    useCallback(
      async (email: string, enable: boolean) => {
        if (enable) {
          await mx.setPusher({
            kind: 'email',
            app_id: 'm.email',
            pushkey: email,
            app_display_name: 'Email Notifications',
            device_display_name: email,
            lang: 'en',
            data: {
              brand: 'Cinny',
            },
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

  const loading = result === undefined || updateState.status === AsyncStatus.Loading;

  const handleChange = (value: boolean) => {
    if (!stableResult?.email) return;
    setOptimisticEnabled(value);
    setEnable(stableResult.email, value).then(
      () => refreshResult(),
      () => setOptimisticEnabled(stableResult.enabled)
    );
  };

  return (
    <SettingTile
      title="Email Notification"
      description={
        <>
          {stableResult && !stableResult.email && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              Your account does not have any email attached.
            </Text>
          )}
          {stableResult?.email && (
            <>Send notification to your email. {`("${stableResult.email}")`}</>
          )}
          {result === null && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              Unexpected Error!
            </Text>
          )}
          {updateState.status === AsyncStatus.Error && (
            <Text as="span" style={{ color: color.Critical.Main }} size="T200">
              Failed to update. Please try again.
            </Text>
          )}
          {stableResult === undefined && 'Send notification to your email.'}
        </>
      }
      after={
        <Box gap="200" alignItems="Center">
          {loading && <Spinner variant="Secondary" />}
          {stableResult?.email && (
            <Switch
              disabled={loading}
              value={optimisticEnabled ?? stableResult.enabled}
              onChange={handleChange}
            />
          )}
        </Box>
      }
    />
  );
}

export function SystemNotification() {
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
      <Text size="L400">System</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Desktop Notifications"
          description={
            notifPermission === 'denied' ? (
              <Text as="span" style={{ color: color.Critical.Main }} size="T200">
                {'Notification' in window
                  ? 'Notification permission is blocked. Please allow notification permission from browser address bar.'
                  : 'Notifications are not supported by the system.'}
              </Text>
            ) : (
              <span>Show desktop notifications when message arrive.</span>
            )
          }
          after={
            notifPermission === 'prompt' ? (
              <Button size="300" radii="300" onClick={requestNotificationPermission}>
                <Text size="B300">Enable</Text>
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
          title="Notification Sound"
          description="Play sound when new message arrive."
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
