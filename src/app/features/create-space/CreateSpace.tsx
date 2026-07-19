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
  CreateRoomAccess,
  CreateRoomAccessSelector,
  RoomVersionSelector,
  useAdditionalCreators,
} from '../../components/create-room';
import { RoomType } from '../../../types/matrix/room';
import { useClient } from '../../hooks/useClient';
import { rError } from '../../../client/reader';

const getCreateSpaceAccessToIcon = (access: CreateRoomAccess) => {
  if (access === CreateRoomAccess.Private) return Icons.SpaceLock;
  if (access === CreateRoomAccess.Restricted) return Icons.Space;
  return Icons.SpaceGlobe;
};

type CreateSpaceFormProps = {
  defaultAccess?: CreateRoomAccess;
  spaceId?: string;
  onCreate?: (roomId: string) => void;
};
export function CreateSpaceForm({ defaultAccess, spaceId, onCreate }: CreateSpaceFormProps) {
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

  const [access, setAccess] = useState(
    defaultAccess ?? (allowRestricted ? CreateRoomAccess.Restricted : CreateRoomAccess.Private)
  );

  const allowAdditionalCreators = creatorsSupported(selectedRoomVersion);
  const { additionalCreators, addAdditionalCreator, removeAdditionalCreator } =
    useAdditionalCreators();
  const [federation, setFederation] = useState(true);
  const [knock, setKnock] = useState(false);
  const [advance, setAdvance] = useState(false);

  const allowKnock = access === CreateRoomAccess.Private && knockSupported(selectedRoomVersion);
  const allowKnockRestricted =
    access === CreateRoomAccess.Restricted && knockRestrictedSupported(selectedRoomVersion);

  const handleRoomVersionChange = (version: string) => {
    if (!restrictedSupported(version)) {
      setAccess(CreateRoomAccess.Private);
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
    const publicRoom = access === CreateRoomAccess.Public;
    let roomKnock = false;
    if (allowKnock && access === CreateRoomAccess.Private) {
      roomKnock = knock;
    }
    if (allowKnockRestricted && access === CreateRoomAccess.Restricted) {
      roomKnock = knock;
    }

    create({
      version: selectedRoomVersion,
      type: RoomType.Space,
      parentId: spaceId,
      access,
      name: roomName,
      topic: roomTopic || undefined,
      aliasLocalPart: publicRoom ? aliasLocalPart : undefined,
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
        <CreateRoomAccessSelector
          value={access}
          onSelect={setAccess}
          canRestrict={allowRestricted}
          disabled={disabled}
          getIcon={getCreateSpaceAccessToIcon}
        />
      </Box>
      <Box shrink="No" direction="Column" gap="100">
        <Text size="L400">Name</Text>
        <Input
          required
          before={<Icon size="100" src={getCreateSpaceAccessToIcon(access)} />}
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

      {access === CreateRoomAccess.Public && <CreateRoomAliasInput disabled={disabled} />}

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
        {access !== CreateRoomAccess.Public && advance && (allowKnock || allowKnockRestricted) && (
          <SequenceCard
            style={{ padding: config.space.S300 }}
            variant="SurfaceVariant"
            direction="Column"
            gap="500"
          >
            <SettingTile
              title="Knock to Join"
              description="Anyone can send request to join this space."
              after={
                <Switch variant="Primary" value={knock} onChange={setKnock} disabled={disabled} />
              }
            />
          </SequenceCard>
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

      {(error || respError) && (
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
