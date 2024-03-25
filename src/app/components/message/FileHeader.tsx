import { Badge, Box, Text, as, toRem } from 'folds';
import React from 'react';
import { mimeTypeToExt } from '../../utils/mimeTypes';

const badgeStyles = { maxWidth: toRem(100) };

export type FileHeaderProps = {
  body: string;
  mimeType: string;
};
export const FileHeader = as<'div', FileHeaderProps>(({ body, mimeType, ...props }, ref) => (
  <Box alignItems="Center" gap="200" grow="Yes" {...props} ref={ref}>
    <Badge style={badgeStyles} variant="Secondary" radii="Pill">
      <Text size="O400" truncate>
        {mimeTypeToExt(mimeType)}
      </Text>
    </Badge>
    <Text size="T300" truncate>
      {body}
    </Text>
  </Box>
));
