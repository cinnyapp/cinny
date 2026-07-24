import React, { FormEventHandler, useCallback, useMemo, useState } from 'react';
import {
  Box,
  Text,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Button,
  Icon,
  Icons,
  Input,
  TextArea,
  Chip,
} from 'folds';
import Linkify from 'linkify-react';
import { nameInitials } from '../../utils/common';
import { BreakWord } from '../../styles/Text.css';
import { LINKIFY_OPTS } from '../../plugins/react-custom-html-parser';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { useFilePicker } from '../../hooks/useFilePicker';
import { useObjectURL } from '../../hooks/useObjectURL';
import { createUploadAtom, UploadSuccess } from '../../state/upload';
import { CompactUploadCardRenderer } from '../upload-card';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { PackMetaReader } from '../../plugins/custom-emoji';
import { useClient } from '../../hooks/useClient';
import { mxcToHttp } from '../../../client/mxcToHttp';

type ImagePackAvatarProps = {
  url?: string;
  name?: string;
};
function ImagePackAvatar({ url, name }: ImagePackAvatarProps) {
  return (
    <Avatar size="500" className={ContainerColor({ variant: 'Secondary' })}>
      {url ? (
        <AvatarImage src={url} alt={name ?? 'Unknown'} />
      ) : (
        <AvatarFallback>
          <Text size="H2">{nameInitials(name ?? 'Unknown')}</Text>
        </AvatarFallback>
      )}
    </Avatar>
  );
}

type ImagePackProfileProps = {
  meta: PackMetaReader;
  canEdit?: boolean;
  onEdit?: () => void;
};
export function ImagePackProfile({ meta, canEdit, onEdit }: ImagePackProfileProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const avatarUrl = meta.avatar
    ? mxcToHttp(ct.session.baseUrl, meta.avatar, useAuthentication).url()
    : undefined;

  return (
    <Box gap="400">
      <Box grow="Yes" direction="Column" gap="300">
        <Box direction="Column" gap="100">
          <Text className={BreakWord} size="H5">
            {meta.name ?? 'Unknown'}
          </Text>
          {meta.attribution && (
            <Text className={BreakWord} size="T200">
              <Linkify options={LINKIFY_OPTS}>{meta.attribution}</Linkify>
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
              onClick={onEdit}
              outlined
            >
              <Text size="B300">Edit</Text>
            </Chip>
          </Box>
        )}
      </Box>
      <Box shrink="No">
        <ImagePackAvatar url={avatarUrl} name={meta.name} />
      </Box>
    </Box>
  );
}

type ImagePackProfileEditProps = {
  meta: PackMetaReader;
  onCancel: () => void;
  onSave: (meta: PackMetaReader) => void;
};
export function ImagePackProfileEdit({ meta, onCancel, onSave }: ImagePackProfileEditProps) {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const [avatar, setAvatar] = useState(meta.avatar);

  const avatarUrl = avatar
    ? mxcToHttp(ct.session.baseUrl, avatar, useAuthentication).url()
    : undefined;

  const [imageFile, setImageFile] = useState<File>();
  const avatarFileUrl = useObjectURL(imageFile);
  const uploadingAvatar = avatarFileUrl ? avatar === meta.avatar : false;
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const pickFile = useFilePicker(setImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
    setAvatar(meta.avatar);
  }, [meta.avatar]);

  const handleUploaded = useCallback((upload: UploadSuccess) => {
    setAvatar(upload.mxc);
  }, []);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (uploadingAvatar) return;

    const target = evt.target as HTMLFormElement | undefined;
    const nameInput = target?.nameInput as HTMLInputElement | undefined;
    const attributionTextArea = target?.attributionTextArea as HTMLTextAreaElement | undefined;
    if (!nameInput || !attributionTextArea) return;

    const name = nameInput.value.trim();
    const attribution = attributionTextArea.value.trim();
    if (!name) return;

    const metaReader = new PackMetaReader({
      avatar_url: avatar,
      display_name: name,
      attribution,
    });
    onSave(metaReader);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Column" gap="400">
      <Box gap="400">
        <Box grow="Yes" direction="Column" gap="100">
          <Text size="L400">Pack Avatar</Text>
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
                onClick={() => pickFile('image/*')}
              >
                <Text size="B300">Upload</Text>
              </Button>
              {!avatar && meta.avatar && (
                <Button
                  type="button"
                  size="300"
                  variant="Success"
                  fill="None"
                  radii="300"
                  onClick={() => setAvatar(meta.avatar)}
                >
                  <Text size="B300">Reset</Text>
                </Button>
              )}
              {avatar && (
                <Button
                  type="button"
                  size="300"
                  variant="Critical"
                  fill="None"
                  radii="300"
                  onClick={() => setAvatar(undefined)}
                >
                  <Text size="B300">Remove</Text>
                </Button>
              )}
            </Box>
          )}
        </Box>
        <Box shrink="No">
          <ImagePackAvatar url={avatarFileUrl ?? avatarUrl} name={meta.name} />
        </Box>
      </Box>
      <Box direction="Inherit" gap="100">
        <Text size="L400">Name</Text>
        <Input name="nameInput" defaultValue={meta.name} variant="Secondary" radii="300" required />
      </Box>
      <Box direction="Inherit" gap="100">
        <Text size="L400">Attribution</Text>
        <TextArea
          name="attributionTextArea"
          defaultValue={meta.attribution}
          variant="Secondary"
          radii="300"
        />
      </Box>
      <Box gap="300">
        <Button type="submit" variant="Success" size="300" radii="300" disabled={uploadingAvatar}>
          <Text size="B300">Save</Text>
        </Button>
        <Button
          type="reset"
          onClick={onCancel}
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
