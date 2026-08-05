import React, { useCallback, useState } from 'react';
import { Box, Button, config, Menu, Spinner, Text } from 'folds';
import { MatrixResponseResult, parseMatrixResp } from 'neurone/lib/matrix-request';
import { Device } from 'neurone/lib/api/types';
import { postDeleteDevices } from 'neurone/lib/api/matrix/client/v3/deleteDevices';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { ActionUIA, ActionUIAFlowsLoader } from '../../../components/ActionUIA';
import { DeviceDeleteBtn, DeviceTile } from './DeviceTile';
import { AsyncState, AsyncStatus, useAsync } from '../../../hooks/useAsyncCallback';
import { useUIAMatrixError } from '../../../hooks/useUIAFlows';
import { DeviceVerificationStatus } from '../../../components/DeviceVerificationStatus';
import { VerifyOtherDeviceTile } from './Verification';
import { VerificationStatus } from '../../../hooks/useDeviceVerificationStatus';
import { useAuthMetadata } from '../../../hooks/useAuthMetadata';
import { withSearchParam } from '../../../pages/pathUtils';
import { useAccountManagementActions } from '../../../hooks/useAccountManagement';
import { SettingTile } from '../../../components/setting-tile';
import { useClient } from '../../../hooks/useClient';

type OtherDevicesProps = {
  devices: Device[];
  refreshDeviceList: () => Promise<void>;
  showVerification?: boolean;
};
export function OtherDevices({ devices, refreshDeviceList, showVerification }: OtherDevicesProps) {
  const ct = useClient();
  const authMetadata = useAuthMetadata();
  const accountManagementActions = useAccountManagementActions();

  const [deleted, setDeleted] = useState<Set<string>>(new Set());

  const handleDashboardOIDC = useCallback(() => {
    const authUrl = authMetadata?.account_management_uri ?? authMetadata?.issuer;
    if (!authUrl) return;

    window.open(
      withSearchParam(authUrl, {
        action: accountManagementActions.sessionsList,
      }),
      '_blank'
    );
  }, [authMetadata, accountManagementActions]);

  const handleDeleteOIDC = useCallback(
    (deviceId: string) => {
      const authUrl = authMetadata?.account_management_uri ?? authMetadata?.issuer;
      if (!authUrl) return;

      window.open(
        withSearchParam(authUrl, {
          action: accountManagementActions.sessionEnd,
          device_id: deviceId,
        }),
        '_blank'
      );
    },
    [authMetadata, accountManagementActions]
  );

  const handleToggleDelete = useCallback((deviceId: string) => {
    setDeleted((deviceIds) => {
      const newIds = new Set(deviceIds);
      if (newIds.has(deviceId)) {
        newIds.delete(deviceId);
      } else {
        newIds.add(deviceId);
      }
      return newIds;
    });
  }, []);

  const [deleteState, setDeleteState] = useState<
    AsyncState<MatrixResponseResult<unknown>, unknown>
  >({
    status: AsyncStatus.Idle,
  });

  const deleteDevices = useAsync(
    useCallback(
      async (authDict?: object) => {
        const resp = await ct.requestAuthJSON(
          postDeleteDevices({ body: { auth: authDict, devices: Array.from(deleted) } })
        );
        return parseMatrixResp(resp);
      },
      [ct, deleted]
    ),
    useCallback(
      (state: typeof deleteState) => {
        if (state.status === AsyncStatus.Success) {
          const [err] = state.data;
          if (!err) {
            setDeleted(new Set());
            refreshDeviceList();
          }
        }
        setDeleteState(state);
      },
      [refreshDeviceList]
    )
  );

  const deleteError = deleteState.status === AsyncStatus.Error ? deleteState.error : undefined;
  const [deleteRespError] = deleteState.status === AsyncStatus.Success ? deleteState.data : [];
  const [authData, deleteMatrixError] = useUIAMatrixError(deleteRespError);
  const deleting = deleteState.status === AsyncStatus.Loading || authData !== undefined;

  const handleCancelDelete = () => setDeleted(new Set());
  const handleCancelAuth = useCallback(() => {
    setDeleteState({ status: AsyncStatus.Idle });
  }, []);

  return devices.length > 0 ? (
    <>
      <Box direction="Column" gap="100">
        <Text size="L400">Others</Text>
        {authMetadata && (
          <SequenceCard
            className={SequenceCardStyle}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            <SettingTile
              title="Device Dashboard"
              description="Manage your devices on OIDC dashboard."
              after={
                <Button
                  size="300"
                  variant="Secondary"
                  fill="Soft"
                  radii="300"
                  outlined
                  onClick={handleDashboardOIDC}
                >
                  <Text size="B300">Open</Text>
                </Button>
              }
            />
          </SequenceCard>
        )}
        {devices
          .sort((d1, d2) => {
            if (!d1.last_seen_ts || !d2.last_seen_ts) return 0;
            return d1.last_seen_ts < d2.last_seen_ts ? 1 : -1;
          })
          .map((device) => (
            <SequenceCard
              key={device.device_id}
              className={SequenceCardStyle}
              variant={deleted.has(device.device_id) ? 'Critical' : 'SurfaceVariant'}
              direction="Column"
              gap="400"
            >
              <DeviceTile
                device={device}
                deleted={deleted.has(device.device_id)}
                refreshDeviceList={refreshDeviceList}
                disabled={deleting}
                options={
                  authMetadata ? (
                    <DeviceDeleteBtn
                      deviceId={device.device_id}
                      deleted={false}
                      onDeleteToggle={handleDeleteOIDC}
                    />
                  ) : (
                    <DeviceDeleteBtn
                      deviceId={device.device_id}
                      deleted={deleted.has(device.device_id)}
                      onDeleteToggle={handleToggleDelete}
                      disabled={deleting}
                    />
                  )
                }
              />
              {showVerification && crypto && (
                <DeviceVerificationStatus userId={ct.session.userId} deviceId={device.device_id}>
                  {(status) =>
                    status === VerificationStatus.Unverified && (
                      <VerifyOtherDeviceTile deviceId={device.device_id} />
                    )
                  }
                </DeviceVerificationStatus>
              )}
            </SequenceCard>
          ))}
      </Box>
      {deleted.size > 0 && (
        <Menu
          style={{
            position: 'sticky',
            padding: config.space.S200,
            paddingLeft: config.space.S400,
            bottom: config.space.S400,
            left: config.space.S400,
            right: 0,
            zIndex: 1,
          }}
          variant="Critical"
        >
          <Box alignItems="Center" gap="400">
            <Box grow="Yes" direction="Column">
              {deleteError || deleteMatrixError ? (
                <Text size="T200">
                  <b>
                    Failed to logout devices! Please try again.{' '}
                    {deleteError instanceof Error
                      ? deleteError.message
                      : deleteMatrixError?.data.error ?? 'Unkonwn Error'}
                  </b>
                </Text>
              ) : (
                <Text size="T200">
                  <b>Logout from selected devices. ({deleted.size} selected)</b>
                </Text>
              )}
              {authData && (
                <ActionUIAFlowsLoader
                  authData={authData}
                  unsupported={() => (
                    <Text size="T200">
                      Authentication steps to perform this action are not supported by client.
                    </Text>
                  )}
                >
                  {(ongoingFlow) => (
                    <ActionUIA
                      authData={authData}
                      ongoingFlow={ongoingFlow}
                      action={deleteDevices}
                      onCancel={handleCancelAuth}
                    />
                  )}
                </ActionUIAFlowsLoader>
              )}
            </Box>
            <Box shrink="No" gap="200">
              <Button
                size="300"
                variant="Critical"
                fill="None"
                radii="300"
                disabled={deleting}
                onClick={handleCancelDelete}
              >
                <Text size="B300">Cancel</Text>
              </Button>
              <Button
                size="300"
                variant="Critical"
                radii="300"
                disabled={deleting}
                before={deleting && <Spinner variant="Critical" fill="Solid" size="100" />}
                onClick={() => deleteDevices()}
              >
                <Text size="B300">Logout</Text>
              </Button>
            </Box>
          </Box>
        </Menu>
      )}
    </>
  ) : null;
}
