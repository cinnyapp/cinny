import {
  Box,
  Dialog,
  Icon,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Text,
  toRem,
} from 'folds';
import React from 'react';

export function FileDropDialog({ visible }: { visible: boolean }) {
  return (
    <Overlay open={visible} backdrop={<OverlayBackdrop />} style={{ pointerEvents: 'none' }}>
      <OverlayCenter>
        <Dialog variant="Primary">
          <Box
            direction="Column"
            justifyContent="Center"
            alignItems="Center"
            gap="500"
            style={{ padding: toRem(60) }}
          >
            <Icon size="600" src={Icons.File} />
            <Text size="H4" align="Center">
              {`Drop Files"`}
            </Text>
            <Text align="Center">Drag and drop files here or click for selection dialog</Text>
          </Box>
        </Dialog>
      </OverlayCenter>
    </Overlay>
  );
}
