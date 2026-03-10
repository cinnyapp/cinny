import FocusTrap from 'focus-trap-react';
import { Text, Box, Button, Overlay, OverlayBackdrop, OverlayCenter, Modal } from 'folds';
import React, { useState, useMemo, useCallback } from 'react';
import { ImageEditor } from '../../../../components/image-editor';
import { SettingTile } from '../../../../components/setting-tile';
import { CompactUploadCardRenderer } from '../../../../components/upload-card';
import { useFilePicker } from '../../../../hooks/useFilePicker';
import { useMatrixClient } from '../../../../hooks/useMatrixClient';
import { useMediaAuthentication } from '../../../../hooks/useMediaAuthentication';
import { useObjectURL } from '../../../../hooks/useObjectURL';
import { createUploadAtom, UploadSuccess } from '../../../../state/upload';
import { stopPropagation } from '../../../../utils/keyboard';
import { mxcUrlToHttp } from '../../../../utils/matrix';
import { FieldContext } from '../Profile';
import { ProfileFieldElementProps } from './ProfileFieldContext';
import { ModalWide } from '../../../../styles/Modal.css';

export function ProfileAvatar({
  busy, value, setValue,
}: ProfileFieldElementProps<'avatar_url', FieldContext>) {
  const mx = useMatrixClient();
  const useAuthentication = useMediaAuthentication();
  const avatarUrl = value
    ? mxcUrlToHttp(mx, value, useAuthentication, 96, 96, 'crop') ?? undefined
    : undefined;
  const disabled = busy;

  const [imageFile, setImageFile] = useState<File>();
  const imageFileURL = useObjectURL(imageFile);
  const uploadAtom = useMemo(() => {
    if (imageFile) return createUploadAtom(imageFile);
    return undefined;
  }, [imageFile]);

  const pickFile = useFilePicker(setImageFile, false);

  const handleRemoveUpload = useCallback(() => {
    setImageFile(undefined);
  }, []);

  const handleUploaded = useCallback(
    (upload: UploadSuccess) => {
      const { mxc } = upload;
      setValue(mxc);
      handleRemoveUpload();
    },
    [setValue, handleRemoveUpload]
  );

  const handleRemoveAvatar = () => {
    setValue('');
  };

  return (
    <SettingTile
      title={<Text as="span" size="L400">
        Avatar
      </Text>}
    >
      {uploadAtom ? (
        <Box gap="200" direction="Column">
          <CompactUploadCardRenderer
            uploadAtom={uploadAtom}
            onRemove={handleRemoveUpload}
            onComplete={handleUploaded} />
        </Box>
      ) : (
        <Box gap="200">
          <Button
            onClick={() => pickFile('image/*')}
            size="300"
            variant="Secondary"
            fill="Soft"
            outlined
            radii="300"
            disabled={disabled}
          >
            <Text size="B300">Upload Avatar</Text>
          </Button>
          {avatarUrl && (
            <Button
              size="300"
              variant="Critical"
              fill="None"
              radii="300"
              disabled={disabled}
              onClick={handleRemoveAvatar}
            >
              <Text size="B300">Remove Avatar</Text>
            </Button>
          )}
        </Box>
      )}

      {imageFileURL && (
        <Overlay open={false} backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: handleRemoveUpload,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Modal className={ModalWide} variant="Surface" size="500">
                <ImageEditor
                  name={imageFile?.name ?? 'Unnamed'}
                  url={imageFileURL}
                  requestClose={handleRemoveUpload} />
              </Modal>
            </FocusTrap>
          </OverlayCenter>
        </Overlay>
      )}
    </SettingTile>
  );
}
