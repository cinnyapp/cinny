import React from 'react';
import { Box, Icon, Icons, toRem, Text, config } from 'folds';
import { ContainerColor } from '../../../styles/ContainerColor.css';
import { BreakWord } from '../../../styles/Text.css';

export function ThreadsError({ error }: { error: Error }) {
  return (
    <Box
      className={ContainerColor({ variant: 'SurfaceVariant' })}
      style={{
        marginBottom: config.space.S200,
        padding: `${config.space.S700} ${config.space.S400} ${toRem(60)}`,
        borderRadius: config.radii.R300,
      }}
      grow="Yes"
      direction="Column"
      gap="400"
      justifyContent="Center"
      alignItems="Center"
    >
      <Icon src={Icons.Warning} size="600" />
      <Box style={{ maxWidth: toRem(300) }} direction="Column" gap="200" alignItems="Center">
        <Text size="H4" align="Center">
          {error.name}
        </Text>
        <Text className={BreakWord} size="T400" align="Center">
          {error.message}
        </Text>
      </Box>
    </Box>
  );
}
