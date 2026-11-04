/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { Box, Text, Chip } from 'folds';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { copyToClipboard } from '../../../utils/dom';
import { useClient } from '../../../hooks/useClient';

export function MatrixId() {
  const ct = useClient();
  const { userId } = ct.session;

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Matrix ID</Text>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={userId}
          after={
            <Chip variant="Secondary" radii="Pill" onClick={() => copyToClipboard(userId)}>
              <Text size="T200">Copy</Text>
            </Chip>
          }
        />
      </SequenceCard>
    </Box>
  );
}
