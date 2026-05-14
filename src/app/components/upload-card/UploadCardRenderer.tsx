import React, { ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Chip, Icon, IconButton, Icons, Text, color, config, toRem } from 'folds';
import { UploadCard, UploadCardError, UploadCardProgress } from './UploadCard';
import { UploadStatus, UploadSuccess, useBindUploadAtom } from '../../state/upload';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { TUploadContent } from '../../utils/matrix';
import { bytesToSize, getFileTypeIcon } from '../../utils/common';
import {
  roomUploadAtomFamily,
  TUploadItem,
  TUploadMetadata,
} from '../../state/room/roomInputDrafts';
import { useObjectURL } from '../../hooks/useObjectURL';
import { useMediaConfig } from '../../hooks/useMediaConfig';

type PreviewImageProps = {
  fileItem: TUploadItem;
};
function PreviewImage({ fileItem }: PreviewImageProps) {
  const { originalFile, metadata } = fileItem;
  const fileUrl = useObjectURL(originalFile);

  return (
    <img
      style={{
        objectFit: 'contain',
        width: '100%',
        height: toRem(152),
        filter: metadata.markedAsSpoiler ? 'blur(44px)' : undefined,
      }}
      alt={originalFile.name}
      src={fileUrl}
    />
  );
}

type PreviewVideoProps = {
  fileItem: TUploadItem;
};
function PreviewVideo({ fileItem }: PreviewVideoProps) {
  const { originalFile, metadata } = fileItem;
  const fileUrl = useObjectURL(originalFile);

  return (
    // eslint-disable-next-line jsx-a11y/media-has-caption
    <video
      style={{
        objectFit: 'contain',
        width: '100%',
        height: toRem(152),
        filter: metadata.markedAsSpoiler ? 'blur(44px)' : undefined,
      }}
      src={fileUrl}
    />
  );
}

type MediaPreviewProps = {
  fileItem: TUploadItem;
  onSpoiler: (marked: boolean) => void;
  children: ReactNode;
};
function MediaPreview({ fileItem, onSpoiler, children }: MediaPreviewProps) {
  const { t } = useTranslation();
  const { originalFile, metadata } = fileItem;
  const fileUrl = useObjectURL(originalFile);

  return fileUrl ? (
    <Box
      style={{
        borderRadius: config.radii.R300,
        overflow: 'hidden',
        backgroundColor: 'black',
        position: 'relative',
      }}
    >
      {children}
      <Box
        justifyContent="End"
        style={{
          position: 'absolute',
          bottom: config.space.S100,
          left: config.space.S100,
          right: config.space.S100,
        }}
      >
        <Chip
          variant={metadata.markedAsSpoiler ? 'Warning' : 'Secondary'}
          fill="Soft"
          radii="Pill"
          aria-pressed={metadata.markedAsSpoiler}
          before={<Icon src={Icons.EyeBlind} size="50" />}
          onClick={() => onSpoiler(!metadata.markedAsSpoiler)}
        >
          <Text size="B300">{t('upload.spoiler')}</Text>
        </Chip>
      </Box>
    </Box>
  ) : null;
}

type UploadCardRendererProps = {
  isEncrypted?: boolean;
  fileItem: TUploadItem;
  setMetadata: (fileItem: TUploadItem, metadata: TUploadMetadata) => void;
  onRemove: (file: TUploadContent) => void;
  onComplete?: (upload: UploadSuccess) => void;
};
export function UploadCardRenderer({
  isEncrypted,
  fileItem,
  setMetadata,
  onRemove,
  onComplete,
}: UploadCardRendererProps) {
  const mx = useMatrixClient();
  const { t } = useTranslation();
  const mediaConfig = useMediaConfig();
  const allowSize = mediaConfig['m.upload.size'] || Infinity;

  const uploadAtom = roomUploadAtomFamily(fileItem.file);
  const { metadata } = fileItem;
  const { upload, startUpload, cancelUpload } = useBindUploadAtom(mx, uploadAtom, isEncrypted);
  const { file } = upload;
  const fileSizeExceeded = file.size >= allowSize;

  if (upload.status === UploadStatus.Idle && !fileSizeExceeded) {
    startUpload();
  }

  const handleSpoiler = (marked: boolean) => {
    setMetadata(fileItem, { ...metadata, markedAsSpoiler: marked });
  };

  const removeUpload = () => {
    cancelUpload();
    onRemove(file);
  };

  useEffect(() => {
    if (upload.status === UploadStatus.Success) {
      onComplete?.(upload);
    }
  }, [upload, onComplete]);

  return (
    <UploadCard
      radii="300"
      before={<Icon src={getFileTypeIcon(Icons, file.type)} />}
      after={
        <>
          {upload.status === UploadStatus.Error && (
            <Chip
              as="button"
              onClick={startUpload}
              aria-label={t('upload.retry')}
              variant="Critical"
              radii="Pill"
              outlined
            >
              <Text size="B300">{t('common.retry')}</Text>
            </Chip>
          )}
          <IconButton
            onClick={removeUpload}
            aria-label={t('upload.cancel')}
            variant="SurfaceVariant"
            radii="Pill"
            size="300"
          >
            <Icon src={Icons.Cross} size="200" />
          </IconButton>
        </>
      }
      bottom={
        <>
          {fileItem.originalFile.type.startsWith('image') && (
            <MediaPreview fileItem={fileItem} onSpoiler={handleSpoiler}>
              <PreviewImage fileItem={fileItem} />
            </MediaPreview>
          )}
          {fileItem.originalFile.type.startsWith('video') && (
            <MediaPreview fileItem={fileItem} onSpoiler={handleSpoiler}>
              <PreviewVideo fileItem={fileItem} />
            </MediaPreview>
          )}
          {upload.status === UploadStatus.Idle && !fileSizeExceeded && (
            <UploadCardProgress sentBytes={0} totalBytes={file.size} />
          )}
          {upload.status === UploadStatus.Loading && (
            <UploadCardProgress sentBytes={upload.progress.loaded} totalBytes={file.size} />
          )}
          {upload.status === UploadStatus.Error && (
            <UploadCardError>
              <Text size="T200">{upload.error.message}</Text>
            </UploadCardError>
          )}
          {upload.status === UploadStatus.Idle && fileSizeExceeded && (
            <UploadCardError>
              <Text size="T200">
                {t('upload.fileSizeExceeded', { maxSize: bytesToSize(allowSize), fileSize: bytesToSize(file.size) })}
              </Text>
            </UploadCardError>
          )}
        </>
      }
    >
      <Text size="H6" truncate>
        {file.name}
      </Text>
      {upload.status === UploadStatus.Success && (
        <Icon style={{ color: color.Success.Main }} src={Icons.Check} size="100" />
      )}
    </UploadCard>
  );
}
