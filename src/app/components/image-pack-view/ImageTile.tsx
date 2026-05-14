import React, { FormEventHandler, ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge, Box, Button, Chip, Icon, Icons, Input, Text } from 'folds';
import { UsageSwitcher, useUsageStr } from './UsageSwitcher';
import { mxcUrlToHttp } from '../../utils/matrix';
import * as css from './style.css';
import { ImageUsage, imageUsageEqual, PackImageReader } from '../../plugins/custom-emoji';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { SettingTile } from '../setting-tile';
import { useObjectURL } from '../../hooks/useObjectURL';
import { createUploadAtom, TUploadAtom } from '../../state/upload';
import { replaceSpaceWithDash } from '../../utils/common';

type ImageTileProps = {
  defaultShortcode: string;
  useAuthentication: boolean;
  packUsage: ImageUsage[];
  image: PackImageReader;
  canEdit?: boolean;
  onEdit?: (defaultShortcode: string, image: PackImageReader) => void;
  deleted?: boolean;
  onDeleteToggle?: (defaultShortcode: string) => void;
};
export function ImageTile({
  defaultShortcode,
  image,
  packUsage,
  useAuthentication,
  canEdit,
  onEdit,
  onDeleteToggle,
  deleted,
}: ImageTileProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const getUsageStr = useUsageStr();

  return (
    <SettingTile
      before={
        <img
          className={css.ImagePackImage}
          src={mxcUrlToHttp(mx, image.url, useAuthentication) ?? ''}
          alt={image.shortcode}
          loading="lazy"
        />
      }
      title={
        deleted ? (
          <span className={css.DeleteImageShortcode}>{image.shortcode}</span>
        ) : (
          image.shortcode
        )
      }
      description={
        <Box as="span" gap="200">
          {image.usage && getUsageStr(image.usage) !== getUsageStr(packUsage) && (
            <Badge as="span" variant="Secondary" size="400" radii="300" outlined>
              <Text as="span" size="L400">
                {getUsageStr(image.usage)}
              </Text>
            </Badge>
          )}
          {image.body}
        </Box>
      }
      after={
        canEdit ? (
          <Box shrink="No" alignItems="Center" gap="200">
            <Chip
              variant={deleted ? 'Critical' : 'Secondary'}
              fill="None"
              radii="Pill"
              onClick={() => onDeleteToggle?.(defaultShortcode)}
            >
              {deleted ? (
                <Text size="B300">{t('imagePack.undo')}</Text>
              ) : (
                <Icon size="50" src={Icons.Delete} />
              )}
            </Chip>
            {!deleted && (
              <Chip
                variant="Secondary"
                radii="Pill"
                onClick={() => onEdit?.(defaultShortcode, image)}
              >
                <Text size="B300">{t('roomSettings.edit')}</Text>
              </Chip>
            )}
          </Box>
        ) : undefined
      }
    />
  );
}

type ImageTileUploadProps = {
  file: File;
  children: (uploadAtom: TUploadAtom) => ReactNode;
};
export function ImageTileUpload({ file, children }: ImageTileUploadProps) {
  const url = useObjectURL(file);
  const uploadAtom = useMemo(() => createUploadAtom(file), [file]);

  return (
    <SettingTile before={<img className={css.ImagePackImage} src={url} alt={file.name} />}>
      {children(uploadAtom)}
    </SettingTile>
  );
}

type ImageTileEditProps = {
  defaultShortcode: string;
  useAuthentication: boolean;
  packUsage: ImageUsage[];
  image: PackImageReader;
  onCancel: (shortcode: string) => void;
  onSave: (shortcode: string, image: PackImageReader) => void;
};
export function ImageTileEdit({
  defaultShortcode,
  useAuthentication,
  packUsage,
  image,
  onCancel,
  onSave,
}: ImageTileEditProps) {
  const { t } = useTranslation();
  const mx = useMatrixClient();
  const defaultUsage = image.usage ?? packUsage;

  const [unsavedUsage, setUnsavedUsages] = useState(defaultUsage);

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();

    const target = evt.target as HTMLFormElement | undefined;
    const shortcodeInput = target?.shortcodeInput as HTMLInputElement | undefined;
    const bodyInput = target?.bodyInput as HTMLTextAreaElement | undefined;
    if (!shortcodeInput || !bodyInput) return;

    const shortcode = replaceSpaceWithDash(shortcodeInput.value.trim());
    const body = bodyInput.value.trim() || undefined;
    const usage = unsavedUsage;

    if (!shortcode) return;

    if (
      shortcode === image.shortcode &&
      body === image.body &&
      imageUsageEqual(usage, defaultUsage)
    ) {
      onCancel(defaultShortcode);
      return;
    }

    const imageReader = new PackImageReader(shortcode, image.url, {
      info: image.info,
      body,
      usage: imageUsageEqual(usage, packUsage) ? undefined : usage,
    });

    onSave(defaultShortcode, imageReader);
  };

  return (
    <SettingTile
      before={
        <img
          className={css.ImagePackImage}
          src={mxcUrlToHttp(mx, image.url, useAuthentication) ?? ''}
          alt={image.shortcode}
          loading="lazy"
        />
      }
    >
      <Box as="form" onSubmit={handleSubmit} direction="Column" gap="200">
        <Box direction="Column" className={css.ImagePackImageInputs}>
          <Input
            before={<Text size="L400">{t('imagePack.shortcode')}</Text>}
            defaultValue={image.shortcode}
            name="shortcodeInput"
            variant="Secondary"
            size="300"
            radii="0"
            required
            autoFocus
          />
          <Input
            before={<Text size="L400">{t('imagePack.body')}</Text>}
            defaultValue={image.body}
            name="bodyInput"
            variant="Secondary"
            size="300"
            radii="0"
          />
        </Box>
        <Box gap="200">
          <Box shrink="No" direction="Column">
            <UsageSwitcher usage={unsavedUsage} onChange={setUnsavedUsages} canEdit />
          </Box>
          <Box grow="Yes" />
          <Button type="submit" variant="Success" size="300" radii="300">
            <Text size="B300">{t('roomSettings.save')}</Text>
          </Button>
          <Button
            type="reset"
            variant="Secondary"
            fill="Soft"
            size="300"
            radii="300"
            onClick={() => onCancel(defaultShortcode)}
          >
            <Text size="B300">{t('roomSettings.cancel')}</Text>
          </Button>
        </Box>
      </Box>
    </SettingTile>
  );
}
