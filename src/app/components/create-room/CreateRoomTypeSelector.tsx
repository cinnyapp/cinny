import React from 'react';
import { Box, Text, Icon, Icons, config, IconSrc } from 'folds';
import { SequenceCard } from '../sequence-card';
import { SettingTile } from '../setting-tile';
import { CreateRoomType } from './types';

type CreateRoomTypeSelectorProps = {
  value?: CreateRoomType;
  onSelect: (value: CreateRoomType) => void;
  disabled?: boolean;
  getIcon: (type: CreateRoomType) => IconSrc;
};
export function CreateRoomTypeSelector({
  value,
  onSelect,
  disabled,
  getIcon,
}: CreateRoomTypeSelectorProps) {
  return (
    <Box shrink="No" direction="Column" gap="100">
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant={value === CreateRoomType.TextRoom ? 'Primary' : 'SurfaceVariant'}
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomType.TextRoom}
        onClick={() => onSelect(CreateRoomType.TextRoom)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomType.TextRoom)} />}
          after={value === CreateRoomType.TextRoom && <Icon src={Icons.Check} />}
        >
          <Text size="H6">Text</Text>
          <Text size="T300" priority="300">
            Send text messages, videos and GIFs.
          </Text>
        </SettingTile>
      </SequenceCard>
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant={value === CreateRoomType.VoiceRoom ? 'Primary' : 'SurfaceVariant'}
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomType.VoiceRoom}
        onClick={() => onSelect(CreateRoomType.VoiceRoom)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomType.VoiceRoom)} />}
          after={value === CreateRoomType.VoiceRoom && <Icon src={Icons.Check} />}
        >
          <Text size="H6">Voice</Text>
          <Text size="T300" priority="300">
            A room optimized for voice calls.
          </Text>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
