import {
  Avatar,
  Box,
  Button,
  Chip,
  color,
  Icon,
  Icons,
  Input,
  Spinner,
  Text,
  TextArea,
} from 'folds';
import React, { FormEventHandler, useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import Linkify from 'linkify-react';
import classNames from 'classnames';
import { JoinRule, MatrixError } from 'matrix-js-sdk';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { useRoom } from '../../../hooks/useRoom';
import {
  useRoomAvatar,
  useRoomJoinRule,
  useRoomName,
  useRoomTopic,
} from '../../../hooks/useRoomMeta';
import { mDirectAtom } from '../../../state/mDirectList';
import { BreakWord, LineClamp3 } from '../../../styles/Text.css';
import { LINKIFY_OPTS } from '../../../plugins/react-custom-html-parser';
import { RoomAvatar, RoomIcon } from '../../../components/room-avatar';
import { mxcUrlToHttp } from '../../../utils/matrix';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../hooks/useMediaAuthentication';
import { StateEvent } from '../../../../types/matrix/room';
import { CompactUploadCardRenderer } from '../../../components/upload-card';
import { useObjectURL } from '../../../hooks/useObjectURL';
import { createUploadAtom, UploadSuccess } from '../../../state/upload';
import { useFilePicker } from '../../../hooks/useFilePicker';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAlive } from '../../../hooks/useAlive';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';

type RoomProfileEditProps = {
  canEditAvatar: boolean;
  canEditName: boolean;
  canEditTopic: boolean;
  avatar?: string;
  name: string;
  topic: string;
  onClose: () => void;
};
export function RoomProfileEdit({
  canEditAvatar,
  canEditName,
  canEditTopic,
  avatar,
  name,
  topic,
  onClose,
}: RoomProfileEditProps) {
  const room = useRoom();
  const mx = useMatrixClient();
  const alive = useAlive();
  const useAuthentication = useMediaAuthentication();
  const joinRule = useRoomJoinRule(room);
  const [roomAvatar, setRoomAvatar] = useState(avatar);

  const avatarUrl = roomAvatar
    ? mxcUrlToHttp(mx, roomAvatar, useAuthentication) ?? undefined
    : undefined;

  const [imageFile, setImageFile] = useState<File>();
  const avatarFileUrl = useObjectURL(imageFile);
  const uploadingAvatar = avatarFileUrl ? roomAvatar === avatar : false;
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const pickFile = useFilePicker(setImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
    setRoomAvatar(avatar);
  }, [avatar]);

  const handleUploaded = useCallback((upload: UploadSuccess) => {
    setRoomAvatar(upload.mxc);
  }, []);

  const [submitState, submit] = useAsyncCallback(
    useCallback(
      async (roomAvatarMxc?: string | null, roomName?: string, roomTopic?: string) => {
        if (roomAvatarMxc !== undefined) {
          await mx.sendStateEvent(room.roomId, StateEvent.RoomAvatar as any, {
            url: roomAvatarMxc,
          });
        }
        if (roomName !== undefined) {
          await mx.sendStateEvent(room.roomId, StateEvent.RoomName as any, { name: roomName });
        }
        if (roomTopic !== undefined) {
          await mx.sendStateEvent(room.roomId, StateEvent.RoomTopic as any, { topic: roomTopic });
        }
      },
      [mx, room.roomId]
    )
  );
  const submitting = submitState.status === AsyncStatus.Loading;

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (uploadingAvatar) return;

    const target = evt.target as HTMLFormElement | undefined;
    const nameInput = target?.nameInput as HTMLInputElement | undefined;
    const topicTextArea = target?.topicTextArea as HTMLTextAreaElement | undefined;
    if (!nameInput || !topicTextArea) return;

    const roomName = nameInput.value.trim();
    const roomTopic = topicTextArea.value.trim();

    if (roomAvatar === avatar && roomName === name && roomTopic === topic) {
      return;
    }

    submit(
      roomAvatar === avatar ? undefined : roomAvatar || null,
      roomName === name ? undefined : roomName,
      roomTopic === topic ? undefined : roomTopic
    ).then(() => {
      if (alive()) {
        onClose();
      }
    });
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="400">
      <Box gap="400">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Avatar</Text>
          {uploadAtom ? (
            <Box gap="200" direction="Column">
              <CompactUploadCardRenderer
                uploadAtom={uploadAtom}
                onRemove={handleRemoveUpload}
                onComplete={handleUploaded}
              />
            </Box>
          ) : (
            <Box gap="200">
              <Button
                type="button"
                size="300"
                variant="Secondary"
                fill="Soft"
                radii="300"
                disabled={!canEditAvatar || submitting}
                onClick={() => pickFile('image/*')}
              >
                <Text size="B300">Upload</Text>
              </Button>
              {!roomAvatar && avatar && (
                <Button
                  type="button"
                  size="300"
                  variant="Success"
                  fill="None"
                  radii="300"
                  disabled={!canEditAvatar || submitting}
                  onClick={() => setRoomAvatar(avatar)}
                >
                  <Text size="B300">Reset</Text>
                </Button>
              )}
              {roomAvatar && (
                <Button
                  type="button"
                  size="300"
                  variant="Critical"
                  fill="None"
                  radii="300"
                  disabled={!canEditAvatar || submitting}
                  onClick={() => setRoomAvatar(undefined)}
                >
                  <Text size="B300">Remove</Text>
                </Button>
              )}
            </Box>
          )}
        </Box>
        <Box shrink="No">
          <Avatar size="500" radii="300">
            <RoomAvatar
              roomId={room.roomId}
              src={avatarUrl}
              alt={name}
              renderFallback={() => (
                <RoomIcon
                  roomType={room.getType()}
                  size="400"
                  joinRule={joinRule?.join_rule ?? JoinRule.Invite}
                  filled
                />
              )}
            />
          </Avatar>
        </Box>
      </Box>
      <Box direction="Inherit" gap="100">
        <Text size="L400">Name</Text>
        <Input
          name="nameInput"
          defaultValue={name}
          variant="Secondary"
          radii="300"
          readOnly={!canEditName || submitting}
        />
      </Box>
      <Box direction="Inherit" gap="100">
        <Text size="L400">Topic</Text>
        <TextArea
          name="topicTextArea"
          defaultValue={topic}
          variant="Secondary"
          radii="300"
          readOnly={!canEditTopic || submitting}
        />
      </Box>
      {submitState.status === AsyncStatus.Error && (
        <Text size="T200" style={{ color: color.Critical.Main }}>
          {(submitState.error as MatrixError).message}
        </Text>
      )}
      <Box gap="300">
        <Button
          type="submit"
          variant="Success"
          size="300"
          radii="300"
          disabled={uploadingAvatar || submitting}
          before={submitting && <Spinner size="100" variant="Success" fill="Solid" />}
        >
          <Text size="B300">Save</Text>
        </Button>
        <Button
          type="reset"
          onClick={onClose}
          variant="Secondary"
          fill="Soft"
          size="300"
          radii="300"
        >
          <Text size="B300">Cancel</Text>
        </Button>
      </Box>
    </Box>
  );
}

type RoomProfileProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomProfile({ permissions }: RoomProfileProps) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const room = useRoom();
  const directs = useAtomValue(mDirectAtom);

  const avatar = useRoomAvatar(room, directs.has(room.roomId));
  const name = useRoomName(room);
  const topic = useRoomTopic(room);
  const joinRule = useRoomJoinRule(room);

  const canEditAvatar = permissions.stateEvent(StateEvent.RoomAvatar, mx.getSafeUserId());
  const canEditName = permissions.stateEvent(StateEvent.RoomName, mx.getSafeUserId());
  const canEditTopic = permissions.stateEvent(StateEvent.RoomTopic, mx.getSafeUserId());
  const canEdit = canEditAvatar || canEditName || canEditTopic;

  const avatarUrl = avatar
    ? mxcUrlToHttp(mx, avatar, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;

  const [edit, setEdit] = useState(false);

  const handleCloseEdit = useCallback(() => setEdit(false), []);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Profile</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        {edit ? (
          <RoomProfileEdit
            canEditAvatar={canEditAvatar}
            canEditName={canEditName}
            canEditTopic={canEditTopic}
            avatar={avatar}
            name={name ?? ''}
            topic={topic ?? ''}
            onClose={handleCloseEdit}
          />
        ) : (
          <Box gap="400">
            <Box grow="Yes" direction="Column" gap="300">
              <Box direction="Column" gap="100">
                <Text className={BreakWord} size="H5">
                  {name ?? 'Unknown'}
                </Text>
                {topic && (
                  <Text className={classNames(BreakWord, LineClamp3)} size="T200">
                    <Linkify options={LINKIFY_OPTS}>{topic}</Linkify>
                  </Text>
                )}
              </Box>
              {canEdit && (
                <Box gap="200">
                  <Chip
                    variant="Secondary"
                    fill="Soft"
                    radii="300"
                    before={<Icon size="50" src={Icons.Pencil} />}
                    onClick={() => setEdit(true)}
                    outlined
                  >
                    <Text size="B300">Edit</Text>
                  </Chip>
                </Box>
              )}
            </Box>
            <Box shrink="No">
              <Avatar size="500" radii="300">
                <RoomAvatar
                  roomId={room.roomId}
                  src={avatarUrl}
                  alt={name}
                  renderFallback={() => (
                    <RoomIcon
                      roomType={room.getType()}
                      size="400"
                      joinRule={joinRule?.join_rule ?? JoinRule.Invite}
                      filled
                    />
                  )}
                />
              </Avatar>
            </Box>
          </Box>
        )}
      </SequenceCard>
    </Box>
  );
}
