// Per-chat auto-translate control, shown inside a room's General settings. Self-contained (part of
// the translation feature) so it stays out of the transcription UI's files. It sets a per-room
// override in the same account-data config used everywhere else; a room override beats the global
// "auto-translate everywhere" setting for that one chat.

import React, { MouseEventHandler, useState } from 'react';
import {
  Box,
  Button,
  Icon,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Switch,
  Text,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import { stopPropagation } from '../../utils/keyboard';
import { useRoom } from '../../hooks/useRoom';
import { useTranslationConfig, useTranslationSettings } from './useTranslation';
import { resolveRoomAutoTranslate } from './translationConfig';
import { TRANSLATION_LANGUAGES, langFlag, langName } from './languages';

type LangPickerProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};
function LangPicker({ value, onChange, disabled }: LangPickerProps) {
  const [anchor, setAnchor] = useState<RectCords>();
  const open: MouseEventHandler<HTMLButtonElement> = (evt) =>
    setAnchor(evt.currentTarget.getBoundingClientRect());
  const close = () => setAnchor(undefined);
  return (
    <PopOut
      anchor={anchor}
      position="Bottom"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: close,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu>
            <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
              {TRANSLATION_LANGUAGES.map((lang) => (
                <MenuItem
                  key={lang.code}
                  size="300"
                  variant={lang.code === value ? 'Primary' : 'Surface'}
                  radii="300"
                  before={<Text size="T300">{lang.flag}</Text>}
                  onClick={() => {
                    onChange(lang.code);
                    close();
                  }}
                >
                  <Text size="T300">{lang.name}</Text>
                </MenuItem>
              ))}
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <Button
        size="300"
        variant="Secondary"
        outlined
        fill="Soft"
        radii="300"
        disabled={disabled}
        after={<Icon size="300" src={Icons.ChevronBottom} />}
        onClick={open}
      >
        <Text size="T300">{`${langFlag(value)} ${langName(value)}`}</Text>
      </Button>
    </PopOut>
  );
}

export function RoomAutoTranslate() {
  const room = useRoom();
  const { roomId } = room;
  const settings = useTranslationSettings();
  const { config: tconfig, setRoomConfig } = useTranslationConfig();

  // If the whole feature isn't configured, don't clutter room settings.
  if (!settings) return null;

  const override = tconfig.rooms?.[roomId];
  const hasOverride = override !== undefined && typeof override.auto === 'boolean';
  const effective = resolveRoomAutoTranslate(tconfig, roomId);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Translation</Text>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Auto-translate this chat"
          description={
            hasOverride
              ? 'Automatically translate incoming messages in this chat. This overrides your global setting.'
              : `Follows your global setting (currently ${
                  effective.auto ? 'on' : 'off'
                }). Turn on to auto-translate just this chat.`
          }
          after={
            <Switch
              variant="Primary"
              value={effective.auto}
              onChange={(v) =>
                setRoomConfig(roomId, {
                  auto: v,
                  targetLang: override?.targetLang ?? effective.targetLang,
                })
              }
            />
          }
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Translate this chat into"
          description="Language incoming messages in this chat are translated into."
          after={
            <LangPicker
              value={effective.targetLang}
              onChange={(code) => setRoomConfig(roomId, { auto: effective.auto, targetLang: code })}
            />
          }
        />
      </SequenceCard>

      {hasOverride && (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          <SettingTile
            title="Use global setting"
            description="Remove this chat's override and follow your global auto-translate setting again."
            after={
              <Button
                size="300"
                variant="Secondary"
                fill="Soft"
                radii="300"
                onClick={() => setRoomConfig(roomId, null)}
              >
                <Text size="B300">Reset</Text>
              </Button>
            }
          />
        </SequenceCard>
      )}
    </Box>
  );
}
