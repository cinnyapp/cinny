import { Box, Button, color, config, Icon, Icons, Input, Spinner, Switch, Text } from 'folds';
import React, { FormEventHandler, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MatrixResponseResult,
  parseMatrixResp,
  printMatrixError,
} from 'neurone/lib/matrix-request';
import {
  CreateRoomStateEvent,
  postCreateRoom,
  PostCreateRoomOK,
} from 'neurone/lib/api/matrix/client/v3/createRoom';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import { addRoomIdToMDirect, isUserId } from '../../utils/matrix';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { ErrorCode } from '../../cs-errorcode';
import { millisecondsToMinutes } from '../../utils/common';
import { createRoomEncryptionState } from '../../components/create-room';
import { useAlive } from '../../hooks/useAlive';
import { getDirectRoomPath } from '../../pages/pathUtils';
import { useClient } from '../../hooks/useClient';
import { rError } from '../../../client/reader';

type CreateChatProps = {
  defaultUserId?: string;
};
export function CreateChat({ defaultUserId }: CreateChatProps) {
  const ct = useClient();
  const alive = useAlive();
  const navigate = useNavigate();

  const [encryption, setEncryption] = useState(true);
  const [invalidUserId, setInvalidUserId] = useState(false);

  const [createState, create] = useAsyncCallback<
    MatrixResponseResult<string>,
    Error,
    [string, boolean]
  >(
    useCallback(
      async (userId, encrypted) => {
        const initialState: CreateRoomStateEvent[] = [];

        if (encrypted) initialState.push(createRoomEncryptionState());

        const response = await ct.requestAuthJSON(
          postCreateRoom({
            body: {
              is_direct: true,
              invite: [userId],
              visibility: 'private',
              preset: 'trusted_private_chat',
              initial_state: initialState,
            },
          })
        );
        const [err, result] = await parseMatrixResp<PostCreateRoomOK>(response);
        if (err) return [err, undefined];

        const roomId = result.room_id;

        addRoomIdToMDirect(ct, roomId, userId);

        return [undefined, roomId];
      },
      [ct]
    )
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const [respError] = createState.status === AsyncStatus.Success ? createState.data : [];
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

    create(userId, encryption).then(([, roomId]) => {
      if (alive() && roomId) {
        userIdInput.value = '';
        navigate(getDirectRoomPath(roomId));
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">User ID</Text>
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
              <b>Please enter a valid User ID.</b>
            </Text>
          </Box>
        )}
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Options</Text>
        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant="SurfaceVariant"
          direction="Column"
          gap="500"
        >
          <SettingTile
            title="End-to-End Encryption"
            description="Once this feature is enabled, it can't be disabled after the room is created."
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
            {error && <b>error.message</b>}
            {respError &&
              (respError.data.errcode === ErrorCode.M_LIMIT_EXCEEDED ? (
                <b>
                  Server rate-limited your request for{' '}
                  {millisecondsToMinutes(rError.retryAfterMs(respError.data) ?? 0)} minutes!
                </b>
              ) : (
                <b>{printMatrixError(respError)}</b>
              ))}
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
          <Text size="B500">Create</Text>
        </Button>
      </Box>
    </Box>
  );
}
