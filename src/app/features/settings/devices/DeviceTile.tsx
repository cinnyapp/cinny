import React, { FormEventHandler, ReactNode, useCallback, useState } from 'react';
import {
  Box,
  Text,
  IconButton,
  Icon,
  Icons,
  Chip,
  Input,
  Button,
  color,
  Spinner,
  toRem,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Device } from 'neurone/lib/api/types';
import { putDevice } from 'neurone/lib/api/matrix/client/v3/devices';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { SettingTile } from '../../../components/setting-tile';
import { timeDayMonYear, timeHourMinute, today, yesterday } from '../../../utils/time';
import { BreakWord } from '../../../styles/Text.css';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { LogoutDialog } from '../../../components/LogoutDialog';
import { stopPropagation } from '../../../utils/keyboard';
import { useSetting } from '../../../state/hooks/settings';
import { settingsAtom } from '../../../state/settings';
import { useClient } from '../../../hooks/useClient';
import { useAlive } from '../../../hooks/useAlive';

export function DeviceTilePlaceholder() {
  return (
    <SequenceCard
      className={SequenceCardStyle}
      style={{ height: toRem(66) }}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    />
  );
}

function DeviceActiveTime({ ts }: { ts: number }) {
  const [hour24Clock] = useSetting(settingsAtom, 'hour24Clock');
  const [dateFormatString] = useSetting(settingsAtom, 'dateFormatString');

  return (
    <Text className={BreakWord} size="T200">
      <Text size="Inherit" as="span" priority="300">
        {'Last activity: '}
      </Text>
      <>
        {today(ts) && 'Today'}
        {yesterday(ts) && 'Yesterday'}
        {!today(ts) && !yesterday(ts) && timeDayMonYear(ts, dateFormatString)}{' '}
        {timeHourMinute(ts, hour24Clock)}
      </>
    </Text>
  );
}

function DeviceDetails({ device }: { device: Device }) {
  return (
    <>
      {typeof device.device_id === 'string' && (
        <Text className={BreakWord} size="T200" priority="300">
          Device ID: <i>{device.device_id}</i>
        </Text>
      )}
      {typeof device.last_seen_ip === 'string' && (
        <Text className={BreakWord} size="T200" priority="300">
          IP Address: <i>{device.last_seen_ip}</i>
        </Text>
      )}
    </>
  );
}

export function DeviceKeyDetails() {
  const ct = useClient();

  return (
    <>
      <Text className={BreakWord} size="T200" priority="300">
        Encryption Key: <i>{ct.machine.getEncryptionKey()}</i>
      </Text>
      <Text className={BreakWord} size="T200" priority="300">
        Singing Key: <i>{ct.machine.getSigningKey()}</i>
      </Text>
    </>
  );
}

type DeviceRenameProps = {
  device: Device;
  onCancel: () => void;
  onRename: () => void;
  refreshDeviceList: () => Promise<void>;
};
function DeviceRename({ device, onCancel, onRename, refreshDeviceList }: DeviceRenameProps) {
  const ct = useClient();
  const alive = useAlive();

  const [renameState, rename] = useAsyncCallback<void, unknown, [string]>(
    useCallback(
      async (name: string) => {
        const resp = await ct.requestAuthJSON(
          putDevice({
            pathParams: { deviceId: device.device_id },
            body: {
              display_name: name,
            },
          })
        );
        const [err] = await parseMatrixResp(resp);
        if (err) throw new Error(err.data.error ?? err.data.errcode);
        await refreshDeviceList();
      },
      [ct, device.device_id, refreshDeviceList]
    )
  );

  const renaming = renameState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (renaming) return;

    const target = evt.target as HTMLFormElement | undefined;
    const nameInput = target?.nameInput as HTMLInputElement | undefined;
    if (!nameInput) return;
    const deviceName = nameInput.value.trim();
    if (!deviceName || deviceName === device.display_name) return;

    rename(deviceName).then(() => {
      if (alive()) {
        onRename();
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="100">
      <Text size="L400">Device Name</Text>
      <Box gap="200">
        <Box grow="Yes" direction="Column">
          <Input
            name="nameInput"
            size="300"
            variant="Secondary"
            radii="300"
            defaultValue={device.display_name}
            autoFocus
            required
            readOnly={renaming}
          />
        </Box>
        <Box shrink="No" gap="200">
          <Button
            type="submit"
            size="300"
            variant="Success"
            radii="300"
            fill="Solid"
            disabled={renaming}
            before={renaming && <Spinner size="100" variant="Success" fill="Solid" />}
          >
            <Text size="B300">Save</Text>
          </Button>
          <Button
            type="button"
            size="300"
            variant="Secondary"
            radii="300"
            fill="Soft"
            onClick={onCancel}
            disabled={renaming}
          >
            <Text size="B300">Cancel</Text>
          </Button>
        </Box>
      </Box>
      {renameState.status === AsyncStatus.Error ? (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {renameState.error instanceof Error ? renameState.error.message : 'Unknown Error'}
        </Text>
      ) : (
        <Text size="T200">Device names are visible to public.</Text>
      )}
    </Box>
  );
}

export function DeviceLogoutBtn() {
  const [prompt, setPrompt] = useState(false);

  const handleClose = () => setPrompt(false);

  return (
    <>
      <Chip variant="Secondary" fill="Soft" radii="Pill" onClick={() => setPrompt(true)}>
        <Text size="B300">Logout</Text>
      </Chip>
      {prompt && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                onDeactivate: handleClose,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <LogoutDialog handleClose={handleClose} />
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}

type DeviceDeleteBtnProps = {
  deviceId: string;
  deleted: boolean;
  onDeleteToggle: (deviceId: string) => void;
  disabled?: boolean;
};
export function DeviceDeleteBtn({
  deviceId,
  deleted,
  onDeleteToggle,
  disabled,
}: DeviceDeleteBtnProps) {
  return deleted ? (
    <Chip
      variant="Critical"
      fill="None"
      radii="Pill"
      onClick={() => onDeleteToggle(deviceId)}
      disabled={disabled}
    >
      <Text size="B300">Undo</Text>
    </Chip>
  ) : (
    <Chip
      variant="Secondary"
      fill="None"
      radii="Pill"
      onClick={() => onDeleteToggle(deviceId)}
      disabled={disabled}
    >
      <Icon size="50" src={Icons.Delete} />
    </Chip>
  );
}

type DeviceTileProps = {
  device: Device;
  deleted?: boolean;
  refreshDeviceList: () => Promise<void>;
  disabled?: boolean;
  options?: ReactNode;
  children?: ReactNode;
};
export function DeviceTile({
  device,
  deleted,
  refreshDeviceList,
  disabled,
  options,
  children,
}: DeviceTileProps) {
  const activeTs = device.last_seen_ts;
  const [details, setDetails] = useState(false);
  const [edit, setEdit] = useState(false);

  const handleRename = useCallback(() => {
    setEdit(false);
  }, []);

  return (
    <>
      <SettingTile
        before={
          <IconButton
            variant={deleted ? 'Critical' : 'Secondary'}
            outlined={deleted}
            radii="300"
            onClick={() => setDetails(!details)}
          >
            <Icon size="50" src={details ? Icons.ChevronBottom : Icons.ChevronRight} />
          </IconButton>
        }
        after={
          !edit && (
            <Box shrink="No" alignItems="Center" gap="200">
              {options}
              {!deleted && (
                <Chip
                  variant="Secondary"
                  radii="Pill"
                  onClick={() => setEdit(true)}
                  disabled={disabled}
                >
                  <Text size="B300">Edit</Text>
                </Chip>
              )}
            </Box>
          )
        }
      >
        <Text size="T300">{device.display_name ?? device.device_id}</Text>
        <Box direction="Column">
          {typeof activeTs === 'number' && <DeviceActiveTime ts={activeTs} />}
          {details && (
            <>
              <DeviceDetails device={device} />
              {children}
            </>
          )}
        </Box>
      </SettingTile>
      {edit && (
        <DeviceRename
          device={device}
          onCancel={() => setEdit(false)}
          onRename={handleRename}
          refreshDeviceList={refreshDeviceList}
        />
      )}
    </>
  );
}
