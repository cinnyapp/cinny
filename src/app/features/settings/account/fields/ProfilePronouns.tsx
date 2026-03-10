import FocusTrap from 'focus-trap-react';
import { RectCords, Text, Box, Chip, Icon, Icons, PopOut, Menu, config, Input, Button } from 'folds';
import { isKeyHotkey } from 'is-hotkey';
import React, { useState, FormEventHandler, KeyboardEventHandler, MouseEventHandler } from 'react';
import { SettingTile } from '../../../../components/setting-tile';
import { stopPropagation } from '../../../../utils/keyboard';
import { FieldContext } from '../Profile';
import { ProfileFieldElementProps } from './ProfileFieldContext';

export function ProfilePronouns({
  value, setValue, busy,
}: ProfileFieldElementProps<'io.fsky.nyx.pronouns', FieldContext>) {
  const disabled = busy;

  const [menuCords, setMenuCords] = useState<RectCords>();
  const [pendingPronoun, setPendingPronoun] = useState('');

  const handleRemovePronoun = (index: number) => {
    const newPronouns = [...(value ?? [])];
    newPronouns.splice(index, 1);
    if (newPronouns.length > 0) {
      setValue(newPronouns);
    } else {
      setValue(undefined);
    }
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    setMenuCords(undefined);
    if (pendingPronoun.length > 0) {
      setValue([...(value ?? []), { language: 'en', summary: pendingPronoun }]);
    }
  };

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (evt) => {
    if (isKeyHotkey('escape', evt)) {
      evt.stopPropagation();
      setMenuCords(undefined);
    }
  };

  const handleOpenMenu: MouseEventHandler<HTMLSpanElement> = (evt) => {
    setPendingPronoun('');
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  return (
    <SettingTile
      title={<Text as="span" size="L400">
        Pronouns
      </Text>}
    >
      <Box alignItems="Center" gap="200" wrap="Wrap">
        {value?.map(({ summary }, index) => (
          <Chip
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            variant="Secondary"
            radii="Pill"
            after={<Icon src={Icons.Cross} size="100" />}
            onClick={() => handleRemovePronoun(index)}
            disabled={disabled}
          >
            <Text size="T200" truncate>
              {summary}
            </Text>
          </Chip>
        ))}
        <Chip
          variant="Secondary"
          radii="Pill"
          disabled={disabled}
          after={<Icon src={menuCords ? Icons.ChevronRight : Icons.Plus} size="100" />}
          onClick={handleOpenMenu}
        >
          <Text size="T200">Add</Text>
        </Chip>
      </Box>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Right"
        align="Center"
        content={<FocusTrap
          focusTrapOptions={{
            onDeactivate: () => setMenuCords(undefined),
            clickOutsideDeactivates: true,
            isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
            isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu
            variant="SurfaceVariant"
            style={{
              padding: config.space.S200,
            }}
          >
            <Box as="form" onSubmit={handleSubmit} direction="Row" gap="200">
              <Input
                variant="Secondary"
                placeholder="they/them"
                inputSize={10}
                radii="300"
                size="300"
                outlined
                value={pendingPronoun}
                onChange={(evt) => setPendingPronoun(evt.currentTarget.value)}
                onKeyDown={handleKeyDown} />
              <Button
                type="submit"
                size="300"
                variant="Success"
                radii="300"
                before={<Icon size="100" src={Icons.Plus} />}
              >
                <Text size="B300">Add</Text>
              </Button>
            </Box>
          </Menu>
        </FocusTrap>} />
    </SettingTile>
  );
}
