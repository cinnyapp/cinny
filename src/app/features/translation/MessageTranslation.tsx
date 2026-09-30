// Per-message translation UI: a small "Translate" trigger shown under a text message plus the
// translated-text box. Backed by Chagai's OFFLINE "Libre"/argos API (translateApi/useTranslation).
//
// This component is fully self-contained and is dropped into the message content column right
// after the message body. It renders NOTHING if translation isn't configured or the event has no
// translatable text — so it is invisible/zero-cost for non-text events and when the backend is off.
//
// NOTE (isolation): this is the translation feature's OWN component/file. It intentionally does not
// touch the shared voice-note transcription UI, to keep merge conflicts minimal.

import React, { MouseEventHandler, useState } from 'react';
import { Box, Icon, Icons, Menu, MenuItem, PopOut, RectCords, Spinner, Text, config } from 'folds';
import FocusTrap from 'focus-trap-react';
import { MatrixEvent } from 'matrix-js-sdk';
import { useEventTranslation } from './useTranslation';
import { TRANSLATION_LANGUAGES, langFlag, langName } from './languages';
import { stopPropagation } from '../../utils/keyboard';
import * as css from './MessageTranslation.css';

type MessageTranslationProps = {
  mEvent: MatrixEvent;
  roomId: string;
};

export function MessageTranslation({ mEvent, roomId }: MessageTranslationProps) {
  const t = useEventTranslation(mEvent, roomId);
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  if (!t.supported) return null;

  const openMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    evt.stopPropagation();
    setMenuAnchor(evt.currentTarget.getBoundingClientRect());
  };
  const closeMenu = () => setMenuAnchor(undefined);

  return (
    <Box direction="Column" alignItems="Start" style={{ maxWidth: '100%' }}>
      {/* The result box (shown once a translation is available and toggled on) */}
      {t.shown && t.result && (
        <div className={css.TranslationBox}>
          <Box className={css.TranslationHeader} alignItems="Center" gap="100">
            <Icon size="50" src={Icons.Globe} />
            <Text as="span" size="T200">
              {`${langFlag(t.result.target)} ${langName(t.result.target)} translation`}
              {t.result.detectedSource ? ` · from ${langName(t.result.detectedSource)}` : ''}
              {!t.result.ok && t.result.reason === 'same-language'
                ? ' · already in this language'
                : ''}
            </Text>
          </Box>
          <Text className={css.TranslationText} size="T300">
            {t.result.translated}
          </Text>
        </div>
      )}

      {t.error && (
        <Text size="T200" style={{ color: config.color?.critical, marginTop: config.space.S100 }}>
          {`Translation failed: ${t.error}`}
        </Text>
      )}

      {/* The trigger row: a translate button + a language-picker chevron */}
      <Box alignItems="Center" gap="200">
        <button
          type="button"
          className={css.TranslateTrigger}
          onClick={(e) => {
            e.stopPropagation();
            t.translate();
          }}
          title={t.shown ? 'Hide translation' : `Translate to ${langName(t.targetLang)}`}
        >
          {t.loading ? <Spinner size="100" /> : <Icon size="50" src={Icons.Globe} />}
          <Text as="span" size="T200">
            {t.shown ? 'Hide translation' : `Translate`}
          </Text>
        </button>

        <PopOut
          anchor={menuAnchor}
          position="Bottom"
          align="Start"
          content={
            <FocusTrap
              focusTrapOptions={{
                initialFocus: false,
                onDeactivate: closeMenu,
                clickOutsideDeactivates: true,
                escapeDeactivates: stopPropagation,
              }}
            >
              <Menu style={{ maxWidth: 'unset' }}>
                <Box className={css.LangMenu} direction="Column" gap="100">
                  {TRANSLATION_LANGUAGES.map((lang) => (
                    <MenuItem
                      key={lang.code}
                      size="300"
                      radii="300"
                      variant="Surface"
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation();
                        closeMenu();
                        t.translate(lang.code);
                      }}
                      before={
                        <Text as="span" size="T300">
                          {lang.flag}
                        </Text>
                      }
                    >
                      <Text size="T300" truncate>
                        {lang.name}
                      </Text>
                    </MenuItem>
                  ))}
                </Box>
              </Menu>
            </FocusTrap>
          }
        >
          <button
            type="button"
            className={css.TranslateTrigger}
            onClick={openMenu}
            aria-pressed={!!menuAnchor}
            title="Choose a language"
          >
            <Icon size="50" src={Icons.ChevronBottom} />
          </button>
        </PopOut>
      </Box>
    </Box>
  );
}
