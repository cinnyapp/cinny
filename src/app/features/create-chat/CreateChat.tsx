import { Box, Button, color, config, Icon, Icons, Input, Spinner, Switch, Text } from 'folds';
import React, { FormEventHandler, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ICreateRoomStateEvent, MatrixError, Preset, Visibility } from 'matrix-js-sdk';
import { useNavigate } from 'react-router-dom';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import { addRoomIdToMDirect, isUserId } from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ErrorCode } from '../../cs-errorcode';
import { millisecondsToMinutes } from '../../utils/common';
import { createRoomEncryptionState } from '../../components/create-room';
import { useAlive } from '../../hooks/useAlive';
import { getDirectRoomPath } from '../../pages/pathUtils';

type CreateChatProps = {
  defaultUserId?: string;
};
export function CreateChat({ defaultUserId }: CreateChatProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const alive = useAlive();
  const navigate = useNavigate();

  const [encryption, setEncryption] = useState(true);
  const [invalidUserId, setInvalidUserId] = useState(false);

  const [createState, create] = useAsyncCallback<string, Error | MatrixError, [string, boolean]>(
    useCallback(
      async (userId, encrypted) => {
        const initialState: ICreateRoomStateEvent[] = [];

        if (encrypted) initialState.push(createRoomEncryptionState());

        const result = await mx.createRoom({
          is_direct: true,
          invite: [userId],
          visibility: Visibility.Private,
          preset: Preset.TrustedPrivateChat,
          initial_state: initialState,
        });

        addRoomIdToMDirect(mx, result.room_id, userId);

        return result.room_id;
      },
      [mx]
    )
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const disabled = createState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    setInvalidUserId(false);

    const target = evt.target as HTMLFormElement | undefined;
    const userIdInput = target?.userIdInput as HTMLInputElement | undefined;
    const userId = userIdInput?.value.trim();

    if (!userIdInput || !userId) return;
    if (!isUserId(userId)) {
      setInvalidUserId(true);
      return;
    }

    create(userId, encryption).then((roomId) => {
      if (alive()) {
        userIdInput.value = '';
        navigate(getDirectRoomPath(roomId));
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">{t('dialog.userId')}</Text>
        <Input
          defaultValue={defaultUserId}
          placeholder="@username:server"
          name="userIdInput"
          variant="SurfaceVariant"
          size="500"
          radii="400"
          required
          autoFocus
          autoComplete="off"
          disabled={disabled}
        />
        {invalidUserId && (
          <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="100">
            <Icon src={Icons.Warning} filled size="50" />
            <Text size="T200" style={{ color: color.Critical.Main }}>
              <b>{t('create.invalidUserId')}</b>
            </Text>
          </Box>
        )}
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">{t('create.options')}</Text>
        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant="SurfaceVariant"
          direction="Column"
          gap="500"
        >
          <SettingTile
            title={t('create.endToEndEncryption')}
            description={t('create.encryptionRoomDesc')}
            after={
              <Switch
                variant="Primary"
                value={encryption}
                onChange={setEncryption}
                disabled={disabled}
              />
            }
          />
        </SequenceCard>
      </Box>
      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          <Icon src={Icons.Warning} filled size="100" />
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>
              {error instanceof MatrixError && error.name === ErrorCode.M_LIMIT_EXCEEDED
                ? t('create.rateLimited', {
                    minutes: millisecondsToMinutes(
                      (error.data.retry_after_ms as number | undefined) ?? 0
                    ),
                  })
                : error.message}
            </b>
          </Text>
        </Box>
      )}
      <Box shrink="No" direction="Column" gap="200">
        <Button
          type="submit"
          size="500"
          variant="Primary"
          radii="400"
          disabled={disabled}
          before={loading && <Spinner variant="Primary" fill="Solid" size="200" />}
        >
          <Text size="B500">{t('create.create')}</Text>
        </Button>
      </Box>
    </Box>
  );
}
