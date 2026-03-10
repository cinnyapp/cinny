import { Text, Box, Input, IconButton, Icon, Icons } from 'folds';
import React, { ChangeEventHandler } from 'react';
import { FilterByValues } from '../../../../../types/utils';
import { SettingTile } from '../../../../components/setting-tile';
import { ExtendedProfile } from '../../../../hooks/useExtendedProfile';
import { FieldContext } from '../Profile';
import { ProfileFieldElementProps } from './ProfileFieldContext';

export function ProfileTextField<K extends keyof FilterByValues<ExtendedProfile, string | undefined>>({
  label, defaultValue, value, setValue, busy,
}: ProfileFieldElementProps<K, FieldContext> & { label: string; }) {
  const disabled = busy;
  const hasChanges = defaultValue !== value;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const content = evt.currentTarget.value;
    if (content.length > 0) {
      setValue(evt.currentTarget.value);
    } else {
      setValue(undefined);
    }
  };

  const handleReset = () => {
    setValue(defaultValue);
  };

  return (
    <SettingTile
      title={<Text as="span" size="L400">
        {label}
      </Text>}
    >
      <Box direction="Column" grow="Yes" gap="100">
        <Box gap="200" aria-disabled={disabled}>
          <Box grow="Yes" direction="Column">
            <Input
              required
              name="displayNameInput"
              value={value ?? ''}
              onChange={handleChange}
              variant="Secondary"
              radii="300"
              disabled={disabled}
              readOnly={disabled}
              after={hasChanges &&
                !busy && (
                  <IconButton
                    type="reset"
                    onClick={handleReset}
                    size="300"
                    radii="300"
                    variant="Secondary"
                  >
                    <Icon src={Icons.Cross} size="100" />
                  </IconButton>
                )} />
          </Box>
        </Box>
      </Box>
    </SettingTile>
  );
}
