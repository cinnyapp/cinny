import { Badge, Box, Icon, Icons, ProgressBar, Text, percent } from 'folds';
import React, { ReactNode, forwardRef } from 'react';

import * as css from './UploadCard.css';
import { bytesToSize } from '../../utils/common';

type UploadCardProps = {
  before?: ReactNode;
  children: ReactNode;
  after?: ReactNode;
  bottom?: ReactNode;
};

export const UploadCard = forwardRef<HTMLDivElement, UploadCardProps & css.UploadCardVariant>(
  ({ before, after, children, bottom, radii }, ref) => (
    <Box className={css.UploadCard({ radii })} direction="Column" gap="200" ref={ref}>
      <Box alignItems="Center" gap="200">
        {before}
        <Box alignItems="Center" grow="Yes" gap="200">
          {children}
        </Box>
        {after}
      </Box>
      {bottom}
    </Box>
  )
);

type UploadCardProgressProps = {
  sentBytes: number;
  totalBytes: number;
};

export function UploadCardProgress({ sentBytes, totalBytes }: UploadCardProgressProps) {
  return (
    <Box direction="Column" gap="200">
      <ProgressBar variant="Secondary" size="300" min={0} max={totalBytes} value={sentBytes} />
      <Box alignItems="Center" justifyContent="SpaceBetween">
        <Badge variant="Secondary" fill="Solid" radii="Pill">
          <Text size="L400">{`${Math.round(percent(0, totalBytes, sentBytes))}%`}</Text>
        </Badge>
        <Badge variant="Secondary" fill="Soft" radii="Pill">
          <Text size="L400">
            {bytesToSize(sentBytes)} / {bytesToSize(totalBytes)}
          </Text>
        </Badge>
      </Box>
    </Box>
  );
}

type UploadCardErrorProps = {
  children: ReactNode;
};

export function UploadCardError({ children }: UploadCardErrorProps) {
  return (
    <Box className={css.UploadCardError} alignItems="Center" gap="300">
      <Icon src={Icons.Warning} size="50" />
      {children}
    </Box>
  );
}
