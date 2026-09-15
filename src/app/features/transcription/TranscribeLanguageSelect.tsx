import React, { MouseEventHandler, useState } from 'react';
import { Box, Button, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Text, config } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { stopPropagation } from '../../utils/keyboard';
import { TRANSCRIBE_LANGUAGES, getTranscribeLanguageName } from './languages';

/**
 * Settings dropdown for the per-user default transcription language.
 * When set (non-"Auto"), the chosen code is passed as `language` on every
 * transcribe call. Stored via Cinny's settings atom (`transcribeLanguage`).
 *
 * Mirrors the existing `SelectMessageLayout` dropdown pattern.
 */
export function TranscribeLanguageSelect() {
  const [menuCords, setMenuCords] = useState<RectCords>();
  const [language, setLanguage] = useSetting(settingsAtom, 'transcribeLanguage');

  const handleMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setMenuCords(evt.currentTarget.getBoundingClientRect());
  };

  const handleSelect = (code: string) => {
    setLanguage(code);
    setMenuCords(undefined);
  };

  return (
    <>
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={handleMenu}
      >
        <Text size="T300">{getTranscribeLanguageName(language)}</Text>
      </Button>
      <PopOut
        anchor={menuCords}
        offset={5}
        position="Bottom"
        align="End"
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              onDeactivate: () => setMenuCords(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowDown' || evt.key === 'ArrowRight',
              isKeyBackward: (evt: KeyboardEvent) =>
                evt.key === 'ArrowUp' || evt.key === 'ArrowLeft',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {TRANSCRIBE_LANGUAGES.map((item) => (
                  <MenuItem
                    key={item.code || 'auto'}
                    size="300"
                    variant={language === item.code ? 'Primary' : 'Surface'}
                    radii="300"
                    onClick={() => handleSelect(item.code)}
                  >
                    <Text size="T300">{item.name}</Text>
                  </MenuItem>
                ))}
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </>
  );
}
