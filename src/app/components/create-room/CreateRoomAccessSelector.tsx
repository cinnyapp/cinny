import React from 'react';
import { Box, Text, Icon, Icons, config, IconSrc } from 'folds';
import { useTranslation } from 'react-i18next';
import { SequenceCard } from '../sequence-card';
import { SettingTile } from '../setting-tile';
import { CreateRoomAccess } from './types';

type CreateRoomAccessSelectorProps = {
  value?: CreateRoomAccess;
  onSelect: (value: CreateRoomAccess) => void;
  canRestrict?: boolean;
  disabled?: boolean;
  getIcon: (access: CreateRoomAccess) => IconSrc;
};
export function CreateRoomAccessSelector({
  value,
  onSelect,
  canRestrict,
  disabled,
  getIcon,
}: CreateRoomAccessSelectorProps) {
  const { t } = useTranslation('createRoom');
  return (
    <Box shrink="No" direction="Column" gap="100">
      {canRestrict && (
        <SequenceCard
          style={{ padding: config.space.S300 }}
          variant={value === CreateRoomAccess.Restricted ? 'Primary' : 'SurfaceVariant'}
          direction="Column"
          gap="100"
          as="button"
          type="button"
          aria-pressed={value === CreateRoomAccess.Restricted}
          onClick={() => onSelect(CreateRoomAccess.Restricted)}
          disabled={disabled}
        >
          <SettingTile
            before={<Icon size="400" src={getIcon(CreateRoomAccess.Restricted)} />}
            after={value === CreateRoomAccess.Restricted && <Icon src={Icons.Check} />}
          >
            <Text size="H6">{t('restricted', { defaultValue: 'Restricted' })}</Text>
            <Text size="T300" priority="300">
              {t('restrictedDescription', {
                defaultValue: 'Only member of parent space can join.',
              })}
            </Text>
          </SettingTile>
        </SequenceCard>
      )}
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant={value === CreateRoomAccess.Private ? 'Primary' : 'SurfaceVariant'}
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomAccess.Private}
        onClick={() => onSelect(CreateRoomAccess.Private)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomAccess.Private)} />}
          after={value === CreateRoomAccess.Private && <Icon src={Icons.Check} />}
        >
          <Text size="H6">{t('private', { defaultValue: 'Private' })}</Text>
          <Text size="T300" priority="300">
            {t('privateDescription', { defaultValue: 'Only people with invite can join.' })}
          </Text>
        </SettingTile>
      </SequenceCard>
      <SequenceCard
        style={{ padding: config.space.S300 }}
        variant={value === CreateRoomAccess.Public ? 'Primary' : 'SurfaceVariant'}
        direction="Column"
        gap="100"
        as="button"
        type="button"
        aria-pressed={value === CreateRoomAccess.Public}
        onClick={() => onSelect(CreateRoomAccess.Public)}
        disabled={disabled}
      >
        <SettingTile
          before={<Icon size="400" src={getIcon(CreateRoomAccess.Public)} />}
          after={value === CreateRoomAccess.Public && <Icon src={Icons.Check} />}
        >
          <Text size="H6">{t('public', { defaultValue: 'Public' })}</Text>
          <Text size="T300" priority="300">
            {t('publicDescription', { defaultValue: 'Anyone with the address can join.' })}
          </Text>
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
