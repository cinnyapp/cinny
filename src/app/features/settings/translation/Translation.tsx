import React, { MouseEventHandler, useState } from 'react';
import {
  Box,
  Button,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Scroll,
  Switch,
  Text,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { Page, PageContent, PageHeader } from '../../../components/page';
import { SequenceCard } from '../../../components/sequence-card';
import { SettingTile } from '../../../components/setting-tile';
import { SequenceCardStyle } from '../styles.css';
import { stopPropagation } from '../../../utils/keyboard';
import { useTranslationConfig, useTranslationSettings } from '../../translation/useTranslation';
import { TRANSLATION_LANGUAGES, langFlag, langName } from '../../translation/languages';

type LanguageSelectProps = {
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};
function LanguageSelect({ value, onChange, disabled }: LanguageSelectProps) {
  const [anchor, setAnchor] = useState<RectCords>();
  const openMenu: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setAnchor(evt.currentTarget.getBoundingClientRect());
  };
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
        onClick={openMenu}
      >
        <Text size="T300">{`${langFlag(value)} ${langName(value)}`}</Text>
      </Button>
    </PopOut>
  );
}

function AutoTranslate() {
  const settings = useTranslationSettings();
  const { config: tconfig, setGlobalAuto, setGlobalTargetLang } = useTranslationConfig();

  const configured = Boolean(settings);

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Auto-translate</Text>

      {!configured && (
        <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
          <SettingTile
            title="Translation backend not configured"
            description="No translation endpoint is set in the app config, so translation is unavailable. Ask the server admin to set the translation.endpoint in config.json."
          />
        </SequenceCard>
      )}

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Auto-translate all messages everywhere"
          description="Automatically translate every incoming message into your chosen language, in all chats. Runs on your own server (offline) — nothing is sent to a cloud translator. You can still translate any single message on demand with the Translate button under it."
          after={
            <Switch
              variant="Primary"
              disabled={!configured}
              value={Boolean(tconfig.globalAuto)}
              onChange={(v) => setGlobalAuto(v)}
            />
          }
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Translate into"
          description="The language messages are translated into (both for auto-translate and as the default for the per-message Translate button)."
          after={
            <LanguageSelect
              value={tconfig.globalTargetLang ?? 'en'}
              onChange={(code) => setGlobalTargetLang(code)}
              disabled={!configured}
            />
          }
        />
      </SequenceCard>

      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Per-chat control"
          description="Auto-translate can also be turned on or off for a single chat from that chat's room settings, overriding this global setting."
        />
      </SequenceCard>
    </Box>
  );
}

type TranslationProps = {
  requestClose: () => void;
};
export function Translation({ requestClose }: TranslationProps) {
  return (
    <Page>
      <PageHeader outlined={false}>
        <Box grow="Yes" gap="200">
          <Box grow="Yes" alignItems="Center" gap="200">
            <Text size="H3" truncate>
              Translation
            </Text>
          </Box>
          <Box shrink="No">
            <IconButton onClick={requestClose} variant="Surface">
              <Icon src={Icons.Cross} />
            </IconButton>
          </Box>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <Box direction="Column" gap="700">
              <AutoTranslate />
            </Box>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
