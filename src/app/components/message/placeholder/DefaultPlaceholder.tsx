import React, { CSSProperties } from 'react';
import { Avatar, Box, as, color, toRem } from 'folds';
import { randomNumberBetween } from '../../../utils/common';
import { LinePlaceholder } from './LinePlaceholder';
import { MessageBase, ModernLayout } from '../layout';

const contentMargin: CSSProperties = { marginTop: toRem(3) };
const avatarBg: CSSProperties = { backgroundColor: color.SurfaceVariant.Container };

export const DefaultPlaceholder = as<'div'>(({ ...props }, ref) => (
  <MessageBase>
    <ModernLayout {...props} ref={ref} before={<Avatar style={avatarBg} size="300" />}>
      <Box style={contentMargin} grow="Yes" direction="Column" gap="200">
        <Box grow="Yes" gap="200" alignItems="Center" justifyContent="SpaceBetween">
          <LinePlaceholder style={{ maxWidth: toRem(randomNumberBetween(40, 100)) }} />
          <LinePlaceholder style={{ maxWidth: toRem(50) }} />
        </Box>
        <Box grow="Yes" gap="200" wrap="Wrap">
          <LinePlaceholder style={{ maxWidth: toRem(randomNumberBetween(80, 200)) }} />
          <LinePlaceholder style={{ maxWidth: toRem(randomNumberBetween(80, 200)) }} />
        </Box>
      </Box>
    </ModernLayout>
  </MessageBase>
));
