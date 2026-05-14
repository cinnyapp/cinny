import React, { MouseEventHandler, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Badge,
  Box,
  Button,
  Chip,
  config,
  Icon,
  Icons,
  Spinner,
  Text,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  IconButton,
  RectCords,
  PopOut,
  Menu,
  MenuItem,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { CryptoApi, VerificationRequest } from 'matrix-js-sdk/lib/crypto-api';
import { VerificationStatus } from '../../../hooks/useDeviceVerificationStatus';
import { InfoCard } from '../../../components/info-card';
import { ManualVerificationTile } from '../../../components/ManualVerification';
import { SecretStorageKeyContent } from '../../../../types/matrix/accountData';
import { AsyncState, AsyncStatus, useAsync } from '../../../hooks/useAsyncCallback';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { DeviceVerification } from '../../../components/DeviceVerification';
import {
  DeviceVerificationReset,
  DeviceVerificationSetup,
} from '../../../components/DeviceVerificationSetup';
import { stopPropagation } from '../../../utils/keyboard';
import { useAuthMetadata } from '../../../hooks/useAuthMetadata';
import { withSearchParam } from '../../../pages/pathUtils';
import { useAccountManagementActions } from '../../../hooks/useAccountManagement';

type VerificationStatusBadgeProps = {
  verificationStatus: VerificationStatus;
  otherUnverifiedCount?: number;
};
export function VerificationStatusBadge({
  verificationStatus,
  otherUnverifiedCount,
}: VerificationStatusBadgeProps) {
  const { t } = useTranslation();
  if (
    verificationStatus === VerificationStatus.Unknown ||
    typeof otherUnverifiedCount !== 'number'
  ) {
    return <Spinner size="400" variant="Secondary" />;
  }
  if (verificationStatus === VerificationStatus.Unverified) {
    return (
      <Badge variant="Critical" fill="Solid" size="500">
        <Text size="L400">{t('settings.deviceSettings.unverified')}</Text>
      </Badge>
    );
  }

  if (otherUnverifiedCount > 0) {
    return (
      <Badge variant="Warning" fill="Solid" size="500">
        <Text size="L400">
          {t('settings.deviceSettings.nUnverified', { count: otherUnverifiedCount })}
        </Text>
      </Badge>
    );
  }

  return (
    <Badge variant="Success" fill="Solid" size="500">
      <Text size="L400">{t('settings.deviceSettings.verified')}</Text>
    </Badge>
  );
}

function LearnStartVerificationFromOtherDevice() {
  return (
    <Box direction="Column">
      <Text size="T200">Steps to verify from other device.</Text>
      <Text as="div" size="T200">
        <ul style={{ margin: `${config.space.S100} 0` }}>
          <li>Open your other verified device.</li>
          <li>
            Open <i>Settings</i>.
          </li>
          <li>
            Find this device in <i>Devices/Sessions</i> section.
          </li>
          <li>Initiate verification.</li>
        </ul>
      </Text>
      <Text size="T200">
        If you do not have any verified device press the <i>&quot;Verify Manually&quot;</i> button.
      </Text>
    </Box>
  );
}

type VerifyCurrentDeviceTileProps = {
  secretStorageKeyId: string;
  secretStorageKeyContent: SecretStorageKeyContent;
};
export function VerifyCurrentDeviceTile({
  secretStorageKeyId,
  secretStorageKeyContent,
}: VerifyCurrentDeviceTileProps) {
  const { t } = useTranslation();
  const [learnMore, setLearnMore] = useState(false);

  const [manualVerification, setManualVerification] = useState(false);
  const handleCancelVerification = () => setManualVerification(false);

  return (
    <>
      <InfoCard
        variant="Critical"
        title={t('settings.deviceSettings.unverified')}
        description={
          <>
            {t('settings.deviceSettings.startVerificationDesc')}{' '}
            <Text as="a" size="T200" onClick={() => setLearnMore(!learnMore)}>
              <b>{learnMore ? t('common.viewLess') : t('common.learnMore')}</b>
            </Text>
          </>
        }
        after={
          !manualVerification && (
            <Button
              size="300"
              variant="Critical"
              fill="Soft"
              radii="300"
              outlined
              onClick={() => setManualVerification(true)}
            >
              <Text as="span" size="B300">
                {t('settings.deviceSettings.verifyManually')}
              </Text>
            </Button>
          )
        }
      >
        {learnMore && <LearnStartVerificationFromOtherDevice />}
      </InfoCard>
      {manualVerification && (
        <ManualVerificationTile
          secretStorageKeyId={secretStorageKeyId}
          secretStorageKeyContent={secretStorageKeyContent}
          options={
            <Chip
              type="button"
              variant="Secondary"
              fill="Soft"
              radii="Pill"
              onClick={handleCancelVerification}
            >
              <Icon size="100" src={Icons.Cross} />
            </Chip>
          }
        />
      )}
    </>
  );
}

type VerifyOtherDeviceTileProps = {
  crypto: CryptoApi;
  deviceId: string;
};
export function VerifyOtherDeviceTile({ crypto, deviceId }: VerifyOtherDeviceTileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const [requestState, setRequestState] = useState<AsyncState<VerificationRequest, Error>>({
    status: AsyncStatus.Idle,
  });

  const requestVerification = useAsync<VerificationRequest, Error, []>(
    useCallback(() => {
      const requestPromise = crypto.requestDeviceVerification(mx.getSafeUserId(), deviceId);
      return requestPromise;
    }, [mx, crypto, deviceId]),
    setRequestState
  );

  const handleExit = useCallback(() => {
    setRequestState({
      status: AsyncStatus.Idle,
    });
  }, []);

  const requesting = requestState.status === AsyncStatus.Loading;
  return (
    <InfoCard
      variant="Warning"
      title={t('settings.deviceSettings.unverified')}
      description={t('settings.deviceSettings.verifyDeviceDesc')}
      after={
        <Button
          size="300"
          variant="Warning"
          radii="300"
          onClick={requestVerification}
          before={requesting && <Spinner size="100" variant="Warning" fill="Solid" />}
          disabled={requesting}
        >
          <Text as="span" size="B300">
            {t('common.verify')}
          </Text>
        </Button>
      }
    >
      {requestState.status === AsyncStatus.Error && (
        <Text size="T200">{requestState.error.message}</Text>
      )}
      {requestState.status === AsyncStatus.Success && (
        <DeviceVerification request={requestState.data} onExit={handleExit} />
      )}
    </InfoCard>
  );
}

type EnableVerificationProps = {
  visible: boolean;
};
export function EnableVerification({ visible }: EnableVerificationProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleCancel = useCallback(() => setOpen(false), []);

  return (
    <>
      {visible && (
        <Button size="300" radii="300" onClick={() => setOpen(true)}>
          <Text as="span" size="B300">
            {t('common.enable')}
          </Text>
        </Button>
      )}
      {open && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                clickOutsideDeactivates: false,
                escapeDeactivates: false,
              }}
            >
              <DeviceVerificationSetup onCancel={handleCancel} />
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}

export function DeviceVerificationOptions() {
  const { t } = useTranslation();
  const [menuCords, setMenuCords] = useState<RectCords>();
  const authMetadata = useAuthMetadata();
  const accountManagementActions = useAccountManagementActions();

  const [reset, setReset] = useState(false);

  const handleCancelReset = useCallback(() => {
    setReset(false);
  }, []);

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (event) => {
    setMenuCords(event.currentTarget.getBoundingClientRect());
  };

  const handleReset = () => {
    setMenuCords(undefined);

    if (authMetadata) {
      const authUrl = authMetadata.account_management_uri ?? authMetadata.issuer;
      window.open(
        withSearchParam(authUrl, {
          action: accountManagementActions.crossSigningReset,
        }),
        '_blank'
      );
      return;
    }

    setReset(true);
  };

  return (
    <>
      <IconButton
        aria-pressed={!!menuCords}
        variant="SurfaceVariant"
        size="300"
        radii="300"
        onClick={handleMenu}
      >
        <Icon size="100" src={Icons.VerticalDots} />
      </IconButton>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="Center"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                <MenuItem
                  variant="Critical"
                  onClick={handleReset}
                  size="300"
                  radii="300"
                  fill="None"
                >
                  <Text as="span" size="T300" truncate>
                    {t('common.reset')}
                  </Text>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
      {reset && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                clickOutsideDeactivates: false,
                escapeDeactivates: false,
              }}
            >
              <DeviceVerificationReset onCancel={handleCancelReset} />
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}
