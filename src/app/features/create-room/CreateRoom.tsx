import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
import { MatrixError, Room } from 'matrix-js-sdk';
import {
  Box,
  Button,
  Chip,
  color,
  config,
  Icon,
  Icons,
  Input,
  Spinner,
  Switch,
  Text,
  TextArea,
} from 'folds';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import {
  creatorsSupported,
  knockRestrictedSupported,
  knockSupported,
  restrictedSupported,
} from '../../utils/matrix';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { millisecondsToMinutes, replaceSpaceWithDash } from '../../utils/common';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useCapabilities } from '../../hooks/useCapabilities';
import { useAlive } from '../../hooks/useAlive';
import { ErrorCode } from '../../cs-errorcode';
import {
  AdditionalCreatorInput,
  createRoom,
  CreateRoomAliasInput,
  CreateRoomData,
  CreateRoomKind,
  CreateRoomKindSelector,
  RoomVersionSelector,
  useAdditionalCreators,
} from '../../components/create-room';

const getCreateRoomKindToIcon = (kind: CreateRoomKind) => {
  if (kind === CreateRoomKind.Private) return Icons.HashLock;
  if (kind === CreateRoomKind.Restricted) return Icons.Hash;
  return Icons.HashGlobe;
};

type CreateRoomFormProps = {
  defaultKind?: CreateRoomKind;
  space?: Room;
  onCreate?: (roomId: string) => void;
};
export function CreateRoomForm({ defaultKind, space, onCreate }: CreateRoomFormProps) {
  const mx = useMatrixClient();
  const alive = useAlive();

  const capabilities = useCapabilities();
  const roomVersions = capabilities['m.room_versions'];
  const [selectedRoomVersion, selectRoomVersion] = useState(roomVersions?.default ?? '1');
  useEffect(() => {
    // capabilities load async
    selectRoomVersion(roomVersions?.default ?? '1');
  }, [roomVersions?.default]);

  const allowRestricted = space && restrictedSupported(selectedRoomVersion);

  const [kind, setKind] = useState(
    defaultKind ?? allowRestricted ? CreateRoomKind.Restricted : CreateRoomKind.Private
  );
  const allowAdditionalCreators = creatorsSupported(selectedRoomVersion);
  const { additionalCreators, addAdditionalCreator, removeAdditionalCreator } =
    useAdditionalCreators();
  const [federation, setFederation] = useState(true);
  const [encryption, setEncryption] = useState(false);
  const [knock, setKnock] = useState(false);
  const [advance, setAdvance] = useState(false);

  const allowKnock = kind === CreateRoomKind.Private && knockSupported(selectedRoomVersion);
  const allowKnockRestricted =
    kind === CreateRoomKind.Restricted && knockRestrictedSupported(selectedRoomVersion);

  const handleRoomVersionChange = (version: string) => {
    if (!restrictedSupported(version)) {
      setKind(CreateRoomKind.Private);
    }
    selectRoomVersion(version);
  };

  const [createState, create] = useAsyncCallback<string, Error | MatrixError, [CreateRoomData]>(
    useCallback((data) => createRoom(mx, data), [mx])
  );
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const disabled = createState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (disabled) return;
    const form = evt.currentTarget;

    const nameInput = form.nameInput as HTMLInputElement | undefined;
    const topicTextArea = form.topicTextAria as HTMLTextAreaElement | undefined;
    const aliasInput = form.aliasInput as HTMLInputElement | undefined;
    const roomName = nameInput?.value.trim();
    const roomTopic = topicTextArea?.value.trim();
    const aliasLocalPart =
      aliasInput && aliasInput.value ? replaceSpaceWithDash(aliasInput.value) : undefined;

    if (!roomName) return;
    const publicRoom = kind === CreateRoomKind.Public;
    let roomKnock = false;
    if (allowKnock && kind === CreateRoomKind.Private) {
      roomKnock = knock;
    }
    if (allowKnockRestricted && kind === CreateRoomKind.Restricted) {
      roomKnock = knock;
    }

    create({
      version: selectedRoomVersion,
      parent: space,
      kind,
      name: roomName,
      topic: roomTopic || undefined,
      aliasLocalPart: publicRoom ? aliasLocalPart : undefined,
      encryption: publicRoom ? false : encryption,
      knock: roomKnock,
      allowFederation: federation,
      additionalCreators: allowAdditionalCreators ? additionalCreators : undefined,
    }).then((roomId) => {
      if (alive()) {
        onCreate?.(roomId);
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} grow="Yes" direction="Column" gap="500">
      <Box direction="Column" gap="100">
        <Text size="L400">Access</Text>
        <CreateRoomKindSelector
          value={kind}
          onSelect={setKind}
          canRestrict={allowRestricted}
          disabled={disabled}
          getIcon={getCreateRoomKindToIcon}
        />
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Name</Text>
        <Input
          required
          before={<Icon size="100" src={getCreateRoomKindToIcon(kind)} />}
          name="nameInput"
          autoFocus
          size="500"
          variant="SurfaceVariant"
          radii="400"
          autoComplete="off"
          disabled={disabled}
        />
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Topic (Optional)</Text>
        <TextArea
          name="topicTextAria"
          size="500"
          variant="SurfaceVariant"
          radii="400"
          disabled={disabled}
        />
      </Box>

      {kind === CreateRoomKind.Public && <CreateRoomAliasInput disabled={disabled} />}

      <Box shrink="No" direction="Column" gap="100">
        <Box gap="200" alignItems="End">
          <Text size="L400">Options</Text>
          <Box grow="Yes" justifyContent="End">
            <Chip
              radii="Pill"
              before={<Icon src={advance ? Icons.ChevronTop : Icons.ChevronBottom} size="50" />}
              onClick={() => setAdvance(!advance)}
              type="button"
            >
              <Text size="T200">Advanced Options</Text>
            </Chip>
          </Box>
        </Box>
        {allowAdditionalCreators && (
          <SequenceCard
            style={{ padding: config.space.S300 }}
            variant="SurfaceVariant"
            direction="Column"
            gap="500"
          >
            <AdditionalCreatorInput
              additionalCreators={additionalCreators}
              onSelect={addAdditionalCreator}
              onRemove={removeAdditionalCreator}
            />
          </SequenceCard>
        )}
        {kind !== CreateRoomKind.Public && (
          <>
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
            {advance && (allowKnock || allowKnockRestricted) && (
              <SequenceCard
                style={{ padding: config.space.S300 }}
                variant="SurfaceVariant"
                direction="Column"
                gap="500"
              >
                <SettingTile
                  title="Knock to Join"
                  description="Anyone can send request to join this room."
                  after={
                    <Switch
                      variant="Primary"
                      value={knock}
                      onChange={setKnock}
                      disabled={disabled}
                    />
                  }
                />
              </SequenceCard>
            )}
          </>
        )}

        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant="SurfaceVariant"
          direction="Column"
          gap="500"
        >
          <SettingTile
            title="Allow Federation"
            description="Users from other servers can join."
            after={
              <Switch
                variant="Primary"
                value={federation}
                onChange={setFederation}
                disabled={disabled}
              />
            }
          />
        </SequenceCard>
        {advance && (
          <RoomVersionSelector
            versions={roomVersions?.available ? Object.keys(roomVersions.available) : ['1']}
            value={selectedRoomVersion}
            onChange={handleRoomVersionChange}
            disabled={disabled}
          />
        )}
      </Box>

      {error && (
        <Box style={{ color: color.Critical.Main }} alignItems="Center" gap="200">
          <Icon src={Icons.Warning} filled size="100" />
          <Text size="T300" style={{ color: color.Critical.Main }}>
            <b>
              {error instanceof MatrixError && error.name === ErrorCode.M_LIMIT_EXCEEDED
                ? `Server rate-limited your request for ${millisecondsToMinutes(
                    (error.data.retry_after_ms as number | undefined) ?? 0
                  )} minutes!`
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
          <Text size="B500">Create</Text>
        </Button>
      </Box>
    </Box>
  );
}
