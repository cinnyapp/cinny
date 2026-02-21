import React, { useState } from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Button,
  color,
  config,
  Dialog,
  Header,
  Icon,
  IconButton,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
} from 'folds';
import { useAtom } from 'jotai';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { pushSubscriptionAtom } from '../../../state/pushSubscription';
import { deRegisterAllPushers } from './PushNotifications';
import { SettingTile } from '../../../components/setting-tile';

type ConfirmDeregisterDialogProps = {
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
};

function ConfirmDeregisterDialog({ onClose, onConfirm, isLoading }: ConfirmDeregisterDialogProps) {
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            clickOutsideDeactivates: true,
            onDeactivate: onClose,
          }}
        >
          <Dialog variant="Surface">
            <Header style={{ padding: `0 ${config.space.S400}` }} variant="Surface" size="500">
              <Box grow="Yes">
                <Text size="H4">Reset All Push Notifications</Text>
              </Box>
              <IconButton size="300" radii="300" onClick={onClose} disabled={isLoading}>
                <Icon size="100" src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text>
                This will remove push notifications from all your sessions and devices. This action
                cannot be undone. Are you sure you want to continue?
              </Text>
              <Box direction="Column" gap="200" style={{ paddingTop: config.space.S200 }}>
                <Button
                  variant="Critical"
                  fill="Solid"
                  onClick={onConfirm}
                  disabled={isLoading}
                  before={isLoading && <Spinner size="100" variant="Critical" />}
                >
                  <Text size="B400">Reset All</Text>
                </Button>
                <Button variant="Secondary" fill="Soft" onClick={onClose} disabled={isLoading}>
                  <Text size="B400">Cancel</Text>
                </Button>
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

export function DeregisterAllPushersSetting() {
  const mx = useMatrixClient();
  const [deregisterState] = useAsyncCallback(deRegisterAllPushers);
  const [isConfirming, setIsConfirming] = useState(false);
  const [usePushNotifications, setPushNotifications] = useSetting(
    settingsAtom,
    'usePushNotifications'
  );

  const [pushSubscription, setPushSubscription] = useAtom(pushSubscriptionAtom);

  const handleOpenConfirmDialog = () => {
    setIsConfirming(true);
  };

  const handleCloseConfirmDialog = () => {
    if (deregisterState.status === AsyncStatus.Loading) return;
    setIsConfirming(false);
  };

  const handleConfirmDeregister = async () => {
    await deRegisterAllPushers(mx);
    setPushNotifications(false);
    setPushSubscription(null);
    setIsConfirming(false);
  };

  return (
    <>
      {isConfirming && (
        <ConfirmDeregisterDialog
          onClose={handleCloseConfirmDialog}
          onConfirm={handleConfirmDeregister}
          isLoading={deregisterState.status === AsyncStatus.Loading}
        />
      )}

      <SettingTile
        title="Reset all push notifications"
        description={
          <div>
            <Text>
              This will remove push notifications from all your sessions/devices. You will need to
              re-enable them on each device individually.
            </Text>
            {deregisterState.status === AsyncStatus.Error && (
              <Text as="span" style={{ color: color.Critical.Main }} size="T200">
                <br />
                Failed to deregister devices. Please try again.
              </Text>
            )}
            {deregisterState.status === AsyncStatus.Success && (
              <Text as="span" style={{ color: color.Success.Main }} size="T200">
                <br />
                Successfully deregistered all devices.
              </Text>
            )}
          </div>
        }
        after={
          <Button size="300" radii="300" onClick={handleOpenConfirmDialog}>
            <Text size="B300" style={{ color: color.Critical.Main }}>
              Reset All
            </Text>
          </Button>
        }
      />
    </>
  );
}
