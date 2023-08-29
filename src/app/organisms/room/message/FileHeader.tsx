import { Badge, Box, Text, as } from 'folds';
import React from 'react';
import { mimeTypeToExt } from '../../../utils/mimeTypes';

export type FileHeaderProps = {
  body: string;
  mimeType: string;
};
export const FileHeader = as<'div', FileHeaderProps>(({ body, mimeType, ...props }, ref) => (
  <Box alignItems="Center" gap="200" grow="Yes" {...props} ref={ref}>
    <Badge variant="Secondary" radii="Pill">
      <Text size="O400">{mimeTypeToExt(mimeType)}</Text>
    </Badge>
    <Text size="T300" truncate>
      {body}
    </Text>
  </Box>
));
