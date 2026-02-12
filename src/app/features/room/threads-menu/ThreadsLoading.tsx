import { Box, config, Spinner } from 'folds';
import React from 'react';
import { ContainerColor } from '../../../styles/ContainerColor.css';

export function ThreadsLoading() {
  return (
    <Box
      className={ContainerColor({ variant: 'SurfaceVariant' })}
      style={{
        marginBottom: config.space.S200,
        padding: config.space.S700,
        borderRadius: config.radii.R300,
      }}
      grow="Yes"
      direction="Column"
      gap="400"
      justifyContent="Center"
      alignItems="Center"
    >
      <Spinner variant="Secondary" />
    </Box>
  );
}
