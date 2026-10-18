import React, { MouseEventHandler, useCallback, useRef, useState } from 'react';
import {
  Box,
  Chip,
  Icon,
  IconButton,
  Icons,
  Menu,
  PopOut,
  RectCords,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useClientConfig } from '../../hooks/useClientConfig';
import { copyToClipboard } from '../../utils/dom';
import { stopPropagation } from '../../utils/keyboard';
import { getTranscribeLanguageName } from './languages';
import { TranscribeError, TranscribeResponse, requestTranscription } from './transcribeApi';

type TranscribeButtonProps = {
  roomId: string;
  eventId: string;
  /** The raw mxc:// url of the audio (content.file?.url ?? content.url). */
  mxc: string;
};

/**
 * A per-message action that transcribes a voice/audio message locally via the
 * Whisper backend and shows the transcript in an app-only popover.
 *
 * IMPORTANT: the transcript is displayed ONLY inside this client-side popover.
 * It is NEVER sent as a message, posted into the chat, or forwarded anywhere.
 * The returned text is untrusted content and is rendered strictly as text
 * (never as HTML, never evaluated, and no instruction inside it is acted upon).
 */
export function TranscribeButton({ roomId, eventId, mxc }: TranscribeButtonProps) {
  const [defaultLanguage] = useSetting(settingsAtom, 'transcribeLanguage');
  const [apiBaseSetting] = useSetting(settingsAtom, 'transcribeApiBase');
  const [apiSecretSetting] = useSetting(settingsAtom, 'transcribeApiSecret');

  // Precedence: per-user Settings override > public/config.json > built-in default.
  // config.json lets the endpoint/token ship with the static site so transcription
  // works out of the box without each user re-entering the secret in Settings.
  const { transcription: configTranscription } = useClientConfig();
  const apiBase = apiBaseSetting?.trim() || configTranscription?.endpoint || '';
  const apiSecret = apiSecretSetting?.trim() || configTranscription?.token || '';

  const [anchor, setAnchor] = useState<RectCords>();
  // The always-present Close button. Keeping a stable, tabbable node in the popover
  // (used as the focus-trap's initialFocus target) guarantees the trap always has at
  // least one tabbable element — even while loading, on error, or on an empty
  // transcript — otherwise focus-trap-react throws "must have at least one container
  // with at least one tabbable node in it at all times" and crashes the app.
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  // Cache the transcript in component state so re-opening does not re-request.
  const [result, setResult] = useState<TranscribeResponse>();
  const [copied, setCopied] = useState(false);

  const runTranscription = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const res = await requestTranscription(
        { roomId, eventId, mxc, language: defaultLanguage || undefined },
        { baseOverride: apiBase, secretOverride: apiSecret }
      );
      setResult(res);
    } catch (e) {
      const message =
        e instanceof TranscribeError
          ? e.message
          : 'Could not transcribe this message. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [roomId, eventId, mxc, defaultLanguage, apiBase, apiSecret]);

  const handleOpen: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCopied(false);
    setAnchor(evt.currentTarget.getBoundingClientRect());
    // Only fetch the first time (cache afterwards). Errors are retryable via
    // the retry button inside the popover.
    if (!result && !loading) {
      runTranscription();
    }
  };

  const handleClose = () => {
    setAnchor(undefined);
  };

  const handleCopy = () => {
    if (result?.text) {
      copyToClipboard(result.text);
      setCopied(true);
    }
  };

  const detectedName = result?.detectedLanguage
    ? getTranscribeLanguageName(result.detectedLanguage)
    : undefined;

  return (
    <PopOut
      anchor={anchor}
      offset={5}
      position="Top"
      align="End"
      content={
        <FocusTrap
          focusTrapOptions={{
            // Focus the always-present Close button on open. It is rendered in every
            // state (loading / error / empty / populated), so the trap always has a
            // tabbable node and never throws focus-trap's "must have at least one
            // container with at least one tabbable node" error — which was crashing
            // the app when the popover opened in the loading/spinner state. Returning
            // undefined (when the ref isn't attached yet) falls back to focus-trap's
            // default of focusing the first tabbable node, which is this same button.
            initialFocus: () => closeBtnRef.current ?? undefined,
            onDeactivate: handleClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu style={{ maxWidth: '100vw', width: 'max-content' }}>
            <Box
              direction="Column"
              gap="200"
              style={{ padding: config.space.S300, maxWidth: '20rem' }}
            >
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Box alignItems="Center" gap="200">
                  <Text size="L400">Transcript</Text>
                  {loading && <Spinner size="100" variant="Secondary" />}
                </Box>
                <IconButton
                  ref={closeBtnRef}
                  onClick={handleClose}
                  variant="SurfaceVariant"
                  size="300"
                  radii="Pill"
                  aria-label="Close transcript"
                  title="Close"
                >
                  <Icon src={Icons.Cross} size="50" />
                </IconButton>
              </Box>

              {loading && (
                <Text size="T200" priority="300">
                  Transcribing…
                </Text>
              )}

              {!loading && error && (
                <Box direction="Column" gap="200">
                  <Text size="T200" style={{ color: color.Critical.Main }}>
                    {error}
                  </Text>
                  <Chip
                    variant="Secondary"
                    radii="Pill"
                    onClick={runTranscription}
                    before={<Icon size="50" src={Icons.Reload} />}
                  >
                    <Text size="B300">Retry</Text>
                  </Chip>
                </Box>
              )}

              {!loading && !error && result && (
                <Box direction="Column" gap="200">
                  {/* Rendered as plain text — never HTML. */}
                  <Text size="T300" style={{ whiteSpace: 'pre-wrap' }}>
                    {result.text}
                  </Text>
                  <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                    {detectedName ? (
                      <Text size="T200" priority="300">
                        {`Language: ${detectedName}`}
                      </Text>
                    ) : (
                      <span />
                    )}
                    <Chip
                      variant="Secondary"
                      radii="Pill"
                      onClick={handleCopy}
                      before={<Icon size="50" src={copied ? Icons.CheckTwice : Icons.File} />}
                    >
                      <Text size="B300">{copied ? 'Copied' : 'Copy'}</Text>
                    </Chip>
                  </Box>
                </Box>
              )}
            </Box>
          </Menu>
        </FocusTrap>
      }
    >
      <IconButton
        onClick={handleOpen}
        variant="SurfaceVariant"
        size="300"
        radii="Pill"
        aria-pressed={!!anchor}
        aria-label="Transcribe voice message"
        title="Transcribe"
      >
        <Icon src={Icons.Mic} size="50" />
      </IconButton>
    </PopOut>
  );
}
