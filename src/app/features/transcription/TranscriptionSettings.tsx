import React, { ChangeEventHandler } from 'react';
import { Box, Input, Text } from 'folds';
import { SequenceCard } from '../../components/sequence-card';
import { SettingTile } from '../../components/setting-tile';
import { SequenceCardStyle } from '../settings/styles.css';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { DEFAULT_TRANSCRIBE_API_BASE } from './transcribeApi';
import { TranscribeLanguageSelect } from './TranscribeLanguageSelect';

/**
 * "Transcription" settings section for the General settings page.
 *
 * - Default language dropdown (per-user default passed to the backend).
 * - Optional API base URL + shared secret overrides so the endpoint can be
 *   re-pointed without a code change (these take precedence over the
 *   VITE_TRANSCRIBE_API_BASE / VITE_TRANSCRIBE_API_SECRET env vars when set).
 *
 * Kept as a standalone component (in the transcription feature folder) so the
 * General page only needs a single-line addition.
 */
export function TranscriptionSettings() {
  const [apiBase, setApiBase] = useSetting(settingsAtom, 'transcribeApiBase');
  const [apiSecret, setApiSecret] = useSetting(settingsAtom, 'transcribeApiSecret');

  const handleBaseChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setApiBase(evt.currentTarget.value);
  };
  const handleSecretChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    setApiSecret(evt.currentTarget.value);
  };

  return (
    <Box direction="Column" gap="100">
      <Text size="L400">Transcription</Text>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Default Language"
          description="Language used when transcribing voice messages. Auto lets Whisper detect it."
          after={<TranscribeLanguageSelect />}
        />
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Transcription Server URL"
          description={`Backend base URL for /transcribe. Leave empty to use the default (${DEFAULT_TRANSCRIBE_API_BASE}) or the VITE_TRANSCRIBE_API_BASE env var.`}
        >
          <Input
            variant="Secondary"
            size="300"
            radii="300"
            placeholder={DEFAULT_TRANSCRIBE_API_BASE}
            value={apiBase ?? ''}
            onChange={handleBaseChange}
            outlined
          />
        </SettingTile>
      </SequenceCard>
      <SequenceCard className={SequenceCardStyle} variant="SurfaceVariant" direction="Column">
        <SettingTile
          title="Transcription Server Secret"
          description="Optional bearer token for the backend. Leave empty to use the VITE_TRANSCRIBE_API_SECRET env var, or the browser session as a fallback."
        >
          <Input
            variant="Secondary"
            size="300"
            radii="300"
            type="password"
            placeholder="Bearer secret (optional)"
            value={apiSecret ?? ''}
            onChange={handleSecretChange}
            outlined
          />
        </SettingTile>
      </SequenceCard>
    </Box>
  );
}
