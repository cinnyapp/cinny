import React, { FormEventHandler, useCallback, useEffect, useState } from 'react';
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
import { MatrixResponseResult, printMatrixError } from 'neurone/lib/matrix-request';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCard } from '../../components/sequence-card';
import {
  creatorsSupported,
  knockRestrictedSupported,
  knockSupported,
  restrictedSupported,
} from '../../utils/matrix';
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
import { useClient } from '../../hooks/useClient';
import { rError } from '../../../client/reader';

const getCreateRoomKindToIcon = (kind: CreateRoomKind) => {
  if (kind === CreateRoomKind.Private) return Icons.HashLock;
  if (kind === CreateRoomKind.Restricted) return Icons.Hash;
  return Icons.HashGlobe;
};

type CreateRoomFormProps = {
  defaultKind?: CreateRoomKind;
  spaceId?: string;
  onCreate?: (roomId: string) => void;
};
export function CreateRoomForm({ defaultKind, spaceId, onCreate }: CreateRoomFormProps) {
  const ct = useClient();
  const alive = useAlive();

  const capabilities = useCapabilities();
  const roomVersions = capabilities['m.room_versions'];
  const [selectedRoomVersion, selectRoomVersion] = useState(roomVersions?.default ?? '1');
  useEffect(() => {
    // capabilities load async
    selectRoomVersion(roomVersions?.default ?? '1');
  }, [roomVersions?.default]);

  const allowRestricted = spaceId ? restrictedSupported(selectedRoomVersion) : false;

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

  const [createState, create] = useAsyncCallback<
    MatrixResponseResult<string>,
    Error,
    [CreateRoomData]
  >(useCallback((data) => createRoom(ct, data), [ct]));
  const loading = createState.status === AsyncStatus.Loading;
  const error = createState.status === AsyncStatus.Error ? createState.error : undefined;
  const [respError] = createState.status === AsyncStatus.Success ? createState.data : [];
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
      parentId: spaceId,
      kind,
      name: roomName,
      topic: roomTopic || undefined,
      aliasLocalPart: publicRoom ? aliasLocalPart : undefined,
      encryption: publicRoom ? false : encryption,
      knock: roomKnock,
      allowFederation: federation,
      additionalCreators: allowAdditionalCreators ? additionalCreators : undefined,
    }).then(([, roomId]) => {
      if (roomId && alive()) {
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
              <Text size="T200">Advance Options</Text>
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
