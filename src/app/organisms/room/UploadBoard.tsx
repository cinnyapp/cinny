import React, { ReactNode } from 'react';
import { Badge, Box, Chip, Header, Icon, Icons, Spinner, Text, as, percent } from 'folds';
import classNames from 'classnames';
import { useAtomValue } from 'jotai';

import * as css from './UploadBoard.css';
import { TUploadFamilyObserverAtom, Upload, UploadStatus, UploadSuccess } from '../../state/upload';

type UploadBoardProps = {
  header: ReactNode;
};
export const UploadBoard = as<'div', UploadBoardProps>(({ header, children, ...props }, ref) => (
  <Box className={css.UploadBoardBase} {...props} ref={ref}>
    <Box className={css.UploadBoardContainer} justifyContent="End">
      <Box className={classNames(css.UploadBoard)} direction="Column">
        <Box direction="Column" shrink="No">
          {header}
        </Box>
        <Box grow="Yes" direction="Column">
          {children}
        </Box>
      </Box>
    </Box>
  </Box>
));

type UploadBoardHeaderProps = {
  open: boolean;
  onToggle: () => void;
  uploadFamilyObserverAtom: TUploadFamilyObserverAtom;
  onCancel: (uploads: Upload[]) => void;
  onSend: (uploads: UploadSuccess[]) => void;
};

export function UploadBoardHeader({
  open,
  onToggle,
  uploadFamilyObserverAtom,
  onCancel,
  onSend,
}: UploadBoardHeaderProps) {
  const uploads = useAtomValue(uploadFamilyObserverAtom);

  const isSuccess = uploads.every((upload) => upload.status === UploadStatus.Success);
  const isError = uploads.some((upload) => upload.status === UploadStatus.Error);
  const progress = uploads.reduce(
    (acc, upload) => {
      acc.total += upload.file.size;
      if (upload.status === UploadStatus.Loading) {
        acc.loaded += upload.progress.loaded;
      }
      if (upload.status === UploadStatus.Success) {
        acc.loaded += upload.file.size;
      }
      return acc;
    },
    { loaded: 0, total: 0 }
  );

  const handleSend = () =>
    onSend(uploads.filter((upload) => upload.status === UploadStatus.Success) as UploadSuccess[]);
  const handleCancel = () => onCancel(uploads);

  return (
    <Header size="400">
      <Box
        as="button"
        style={{ cursor: 'pointer' }}
        onClick={onToggle}
        className={css.UploadBoardHeaderContent}
        alignItems="Center"
        grow="Yes"
        gap="100"
      >
        <Icon src={open ? Icons.ChevronBottom : Icons.ChevronRight} size="50" />
        <Text size="H6">Files</Text>
      </Box>
      <Box className={css.UploadBoardHeaderContent} alignItems="Center" gap="100">
        {isSuccess && (
          <Chip
            as="button"
            aria-label="Send Files"
            onClick={handleSend}
            variant="Primary"
            radii="Pill"
            outlined
            after={<Icon src={Icons.Send} size="50" filled />}
          >
            <Text size="B300">Send</Text>
          </Chip>
        )}
        {isError && !open && (
          <Badge variant="Critical" fill="Solid" radii="300">
            <Text size="L400">Upload Failed</Text>
          </Badge>
        )}
        {!isSuccess && !isError && !open && (
          <>
            <Badge variant="Secondary" fill="Solid" radii="Pill">
              <Text size="L400">{Math.round(percent(0, progress.total, progress.loaded))}%</Text>
            </Badge>
            <Spinner variant="Secondary" size="200" />
          </>
        )}
        {!isSuccess && open && (
          <Chip
            as="button"
            aria-label="Remove All"
            onClick={handleCancel}
            variant="SurfaceVariant"
            radii="Pill"
            after={<Icon src={Icons.Cross} size="50" />}
          >
            <Text size="B300">Remove All</Text>
          </Chip>
        )}
      </Box>
    </Header>
  );
}

export const UploadBoardContent = as<'div'>(({ className, children, ...props }, ref) => (
  <Box
    className={classNames(css.UploadBoardContent, className)}
    direction="Column"
    gap="200"
    {...props}
    ref={ref}
  >
    {children}
  </Box>
));
