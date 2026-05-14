import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { as, Box, Text, config, Button, Menu, Spinner } from 'folds';
import { useTranslation } from 'react-i18next';
import {
  ImagePack,
  ImageUsage,
  PackContent,
  PackImage,
  PackImageReader,
  packMetaEqual,
  PackMetaReader,
} from '../../plugins/custom-emoji';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { SequenceCard } from '../sequence-card';
import { ImageTile, ImageTileEdit, ImageTileUpload } from './ImageTile';
import { SettingTile } from '../setting-tile';
import { UsageSwitcher } from './UsageSwitcher';
import { ImagePackProfile, ImagePackProfileEdit } from './PackMeta';
import * as css from './style.css';
import { useFilePicker } from '../../hooks/useFilePicker';
import { CompactUploadCardRenderer } from '../upload-card';
import { UploadSuccess } from '../../state/upload';
import { getImageInfo, TUploadContent } from '../../utils/matrix';
import { getImageFileUrl, loadImageElement, renameFile } from '../../utils/dom';
import { replaceSpaceWithDash, suffixRename } from '../../utils/common';
import { getFileNameWithoutExt } from '../../utils/mimeTypes';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';

export type ImagePackContentProps = {
  imagePack: ImagePack;
  canEdit?: boolean;
  onUpdate?: (packContent: PackContent) => Promise<void>;
};

export const ImagePackContent = as<'div', ImagePackContentProps>(
  ({ imagePack, canEdit, onUpdate, ...props }, ref) => {
    const { t } = useTranslation();
    const useAuthentication = useMediaAuthentication();

    const [metaEditing, setMetaEditing] = useState(false);
    const [savedMeta, setSavedMeta] = useState<PackMetaReader>();
    const currentMeta = savedMeta ?? imagePack.meta;

    const images = useMemo(() => Array.from(imagePack.images.collection.values()), [imagePack]);
    const [files, setFiles] = useState<File[]>([]);
    const [uploadedImages, setUploadedImages] = useState<PackImageReader[]>([]);
    const [imagesEditing, setImagesEditing] = useState<Set<string>>(new Set());
    const [savedImages, setSavedImages] = useState<Map<string, PackImageReader>>(new Map());
    const [deleteImages, setDeleteImages] = useState<Set<string>>(new Set());

    const hasImageWithShortcode = useCallback(
      (shortcode: string): boolean => {
        const hasInPack = imagePack.images.collection.has(shortcode);
        if (hasInPack) return true;
        const hasInUploaded =
          uploadedImages.find((img) => img.shortcode === shortcode) !== undefined;
        if (hasInUploaded) return true;
        const hasInSaved =
          Array.from(savedImages).find(([, img]) => img.shortcode === shortcode) !== undefined;
        return hasInSaved;
      },
      [imagePack, savedImages, uploadedImages]
    );

    const pickFiles = useFilePicker(
      useCallback(
        (pickedFiles: File[]) => {
          const uniqueFiles = pickedFiles.map((file) => {
            const fileName = replaceSpaceWithDash(file.name);
            if (hasImageWithShortcode(fileName)) {
              const uniqueName = suffixRename(fileName, hasImageWithShortcode);
              return renameFile(file, uniqueName);
            }
            return fileName !== file.name ? renameFile(file, fileName) : file;
          });

          setFiles((f) => [...f, ...uniqueFiles]);
        },
        [hasImageWithShortcode]
      ),
      true
    );

    const handleMetaSave = useCallback(
      (editedMeta: PackMetaReader) => {
        setMetaEditing(false);
        setSavedMeta(
          (m) =>
            new PackMetaReader({
              ...imagePack.meta.content,
              ...m?.content,
              ...editedMeta.content,
            })
        );
      },
      [imagePack.meta]
    );

    const handleMetaCancel = () => setMetaEditing(false);

    const handlePackUsageChange = useCallback(
      (usg: ImageUsage[]) => {
        setSavedMeta(
          (m) =>
            new PackMetaReader({
              ...imagePack.meta.content,
              ...m?.content,
              usage: usg,
            })
        );
      },
      [imagePack.meta]
    );

    const handleUploadRemove = useCallback((file: TUploadContent) => {
      setFiles((fs) => fs.filter((f) => f !== file));
    }, []);

    const handleUploadComplete = useCallback(
      async (data: UploadSuccess) => {
        const imgEl = await loadImageElement(getImageFileUrl(data.file));
        const packImage: PackImage = {
          url: data.mxc,
          info: getImageInfo(imgEl, data.file),
        };
        const image = PackImageReader.fromPackImage(
          getFileNameWithoutExt(data.file.name),
          packImage
        );
        if (!image) return;
        handleUploadRemove(data.file);
        setUploadedImages((imgs) => [image, ...imgs]);
      },
      [handleUploadRemove]
    );

    const handleImageEdit = (shortcode: string) => {
      setImagesEditing((shortcodes) => {
        const shortcodeSet = new Set(shortcodes);
        shortcodeSet.add(shortcode);
        return shortcodeSet;
      });
    };
    const handleDeleteToggle = (shortcode: string) => {
      setDeleteImages((shortcodes) => {
        const shortcodeSet = new Set(shortcodes);
        if (shortcodeSet.has(shortcode)) shortcodeSet.delete(shortcode);
        else shortcodeSet.add(shortcode);
        return shortcodeSet;
      });
    };

    const handleImageEditCancel = (shortcode: string) => {
      setImagesEditing((shortcodes) => {
        const shortcodeSet = new Set(shortcodes);
        shortcodeSet.delete(shortcode);
        return shortcodeSet;
      });
    };

    const handleImageEditSave = (shortcode: string, image: PackImageReader) => {
      handleImageEditCancel(shortcode);

      const saveImage =
        shortcode !== image.shortcode && hasImageWithShortcode(image.shortcode)
          ? new PackImageReader(
              suffixRename(image.shortcode, hasImageWithShortcode),
              image.url,
              image.content
            )
          : image;

      setSavedImages((sImgs) => {
        const imgs = new Map(sImgs);
        imgs.set(shortcode, saveImage);
        return imgs;
      });
    };

    const handleResetSavedChanges = () => {
      setSavedMeta(undefined);
      setFiles([]);
      setUploadedImages([]);
      setSavedImages(new Map());
      setDeleteImages(new Set());
    };

    const [applyState, applyChanges] = useAsyncCallback(
      useCallback(async () => {
        const pack: PackContent = {
          pack: savedMeta?.content ?? imagePack.meta.content,
          images: {},
        };
        const pushImage = (img: PackImageReader) => {
          if (deleteImages.has(img.shortcode)) return;
          if (!pack.images) return;
          const imgToPush = savedImages.get(img.shortcode) ?? img;
          pack.images[imgToPush.shortcode] = imgToPush.content;
        };
        uploadedImages.forEach((img) => pushImage(img));
        images.forEach((img) => pushImage(img));

        return onUpdate?.(pack);
      }, [imagePack, images, savedMeta, uploadedImages, savedImages, deleteImages, onUpdate])
    );

    useEffect(() => {
      if (applyState.status === AsyncStatus.Success) {
        handleResetSavedChanges();
      }
    }, [applyState]);

    const savedChanges =
      (savedMeta && !packMetaEqual(imagePack.meta, savedMeta)) ||
      uploadedImages.length > 0 ||
      savedImages.size > 0 ||
      deleteImages.size > 0;
    const canApplyChanges = !metaEditing && imagesEditing.size === 0 && files.length === 0;
    const applying = applyState.status === AsyncStatus.Loading;

    const renderImage = (image: PackImageReader) => (
      <SequenceCard
        key={image.shortcode}
        style={{ padding: config.space.S300 }}
        variant={deleteImages.has(image.shortcode) ? 'Critical' : 'SurfaceVariant'}
        direction="Column"
        gap="400"
      >
        {imagesEditing.has(image.shortcode) ? (
          <ImageTileEdit
            defaultShortcode={image.shortcode}
            image={savedImages.get(image.shortcode) ?? image}
            packUsage={currentMeta.usage}
            useAuthentication={useAuthentication}
            onCancel={handleImageEditCancel}
            onSave={handleImageEditSave}
          />
        ) : (
          <ImageTile
            defaultShortcode={image.shortcode}
            image={savedImages.get(image.shortcode) ?? image}
            packUsage={currentMeta.usage}
            useAuthentication={useAuthentication}
            canEdit={canEdit}
            onEdit={handleImageEdit}
            deleted={deleteImages.has(image.shortcode)}
            onDeleteToggle={handleDeleteToggle}
          />
        )}
      </SequenceCard>
    );

    return (
      <Box grow="Yes" direction="Column" gap="700" {...props} ref={ref}>
        {savedChanges && (
          <Menu className={css.UnsavedMenu} variant="Success">
            <Box alignItems="Center" gap="400">
              <Box grow="Yes" direction="Column">
                {applyState.status === AsyncStatus.Error ? (
                  <Text size="T200">
                    <b>{t('roomSettings.failedApply')}</b>
                  </Text>
                ) : (
                  <Text size="T200">
                    <b>{t('roomSettings.changesSaved')}</b>
                  </Text>
                )}
              </Box>
              <Box shrink="No" gap="200">
                <Button
                  size="300"
                  variant="Success"
                  fill="None"
                  radii="300"
                  disabled={!canApplyChanges || applying}
                  onClick={handleResetSavedChanges}
                >
                  <Text size="B300">{t('roomSettings.reset')}</Text>
                </Button>
                <Button
                  size="300"
                  variant="Success"
                  radii="300"
                  disabled={!canApplyChanges || applying}
                  before={applying && <Spinner variant="Success" fill="Solid" size="100" />}
                  onClick={applyChanges}
                >
                  <Text size="B300">{t('roomSettings.applyChanges')}</Text>
                </Button>
              </Box>
            </Box>
          </Menu>
        )}
        <Box direction="Column" gap="100">
          <Text size="L400">{t('imagePack.pack')}</Text>
          <SequenceCard
            style={{ padding: config.space.S300 }}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            {metaEditing ? (
              <ImagePackProfileEdit
                meta={currentMeta}
                onCancel={handleMetaCancel}
                onSave={handleMetaSave}
              />
            ) : (
              <ImagePackProfile
                meta={currentMeta}
                canEdit={canEdit}
                onEdit={() => setMetaEditing(true)}
              />
            )}
          </SequenceCard>
          <SequenceCard
            style={{ padding: config.space.S300 }}
            variant="SurfaceVariant"
            direction="Column"
            gap="400"
          >
            <SettingTile
              title={t('imagePack.imagesUsage')}
              description={t('imagePack.imagesUsageDesc')}
              after={
                <UsageSwitcher
                  usage={currentMeta.usage}
                  canEdit={canEdit}
                  onChange={handlePackUsageChange}
                />
              }
            />
          </SequenceCard>
        </Box>
        {images.length === 0 && !canEdit ? null : (
          <Box direction="Column" gap="100">
            <Text size="L400">{t('imagePack.images')}</Text>
            {canEdit && (
              <SequenceCard
                style={{ padding: config.space.S300 }}
                variant="SurfaceVariant"
                direction="Column"
                gap="400"
              >
                <SettingTile
                  title={t('imagePack.uploadImages')}
                  description={t('imagePack.uploadImagesDesc')}
                  after={
                    <Button
                      variant="Secondary"
                      fill="Soft"
                      size="300"
                      radii="300"
                      type="button"
                      outlined
                      onClick={() => pickFiles('image/*')}
                    >
                      <Text size="B300">{t('imagePack.select')}</Text>
                    </Button>
                  }
                />
              </SequenceCard>
            )}
            {files.map((file) => (
              <SequenceCard
                key={file.name}
                style={{ padding: config.space.S300 }}
                variant="SurfaceVariant"
                direction="Column"
                gap="400"
              >
                <ImageTileUpload file={file}>
                  {(uploadAtom) => (
                    <CompactUploadCardRenderer
                      uploadAtom={uploadAtom}
                      onRemove={handleUploadRemove}
                      onComplete={handleUploadComplete}
                    />
                  )}
                </ImageTileUpload>
              </SequenceCard>
            ))}
            {uploadedImages.map(renderImage)}
            {images.map(renderImage)}
          </Box>
        )}
      </Box>
    );
  }
);
