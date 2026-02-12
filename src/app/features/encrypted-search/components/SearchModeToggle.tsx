/**
 * Toggle between server search and local encrypted search
 */

import React from 'react';
import { Text, Box, Icon, Icons, config, Button } from 'folds';
import { useLocalSearchAvailable } from '../hooks/useLocalMessageSearch';

export type SearchMode = 'server' | 'local';

interface SearchModeToggleProps {
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  disabled?: boolean;
}

export function SearchModeToggle({ mode, onModeChange, disabled }: SearchModeToggleProps) {
  const localSearchAvailable = useLocalSearchAvailable();

  return (
    <Box direction="Column" gap="200">
      <Text size="L400" priority="400">
        Search Mode
      </Text>

      <Box gap="200">
        <Button
          variant={mode === 'server' ? 'Primary' : 'Secondary'}
          fill={mode === 'server' ? 'Solid' : 'Soft'}
          size="400"
          onClick={() => onModeChange('server')}
          disabled={disabled}
          style={{ flex: 1 }}
        >
          <Icon size="200" src={Icons.Server} />
          <Text>Server Search</Text>
        </Button>

        <Button
          variant={mode === 'local' ? 'Primary' : 'Secondary'}
          fill={mode === 'local' ? 'Solid' : 'Soft'}
          size="400"
          onClick={() => onModeChange('local')}
          disabled={disabled || !localSearchAvailable}
          style={{ flex: 1 }}
        >
          <Icon size="200" src={Icons.Lock} />
          <Text>Local Search</Text>
        </Button>
      </Box>

      <Box direction="Column" gap="100">
        {mode === 'server' && (
          <Box
            style={{
              padding: config.space.S200,
              backgroundColor: 'var(--bg-surface-low)',
              borderRadius: config.radii.R300,
            }}
            gap="100"
            alignItems="Start"
          >
            <Icon size="100" src={Icons.Info} />
            <Text size="T300" priority="300">
              Server search works only with unencrypted messages. Encrypted messages cannot be
              searched.
            </Text>
          </Box>
        )}

        {mode === 'local' && !localSearchAvailable && (
          <Box
            style={{
              padding: config.space.S200,
              backgroundColor: 'var(--bg-warning-container)',
              borderRadius: config.radii.R300,
            }}
            gap="100"
            alignItems="Start"
          >
            <Icon size="100" src={Icons.Warning} />
            <Text size="T300">
              Local search is not set up. Please enable it in Settings to search encrypted
              messages.
            </Text>
          </Box>
        )}

        {mode === 'local' && localSearchAvailable && (
          <Box
            style={{
              padding: config.space.S200,
              backgroundColor: 'var(--bg-success-container)',
              borderRadius: config.radii.R300,
            }}
            gap="100"
            alignItems="Start"
          >
            <Icon size="100" src={Icons.Check} />
            <Text size="T300">
              Local search is active. All messages including encrypted ones can be searched.
            </Text>
          </Box>
        )}
      </Box>
    </Box>
  );
}
