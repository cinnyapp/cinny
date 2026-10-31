import React, { MouseEventHandler, useCallback, useEffect, useRef, useState } from 'react';
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
import type { EncryptedAttachmentInfo } from 'browser-encrypt-attachment';
import FocusTrap from '../../components/focus-trap';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useClientConfig } from '../../hooks/useClientConfig';
import { copyToClipboard } from '../../utils/dom';
import { stopPropagation } from '../../utils/keyboard';
import { getTranscribeLanguageName } from './languages';
import {
  TranscribeError,
  TranscribeResponse,
  fetchStoredTranscript,
  requestTranscription,
} from './transcribeApi';
import { describeTranscript, pollForBetter, runTranscriptFlow } from './transcriptFlow';

/** After this long without an answer the request is a live transcription, not a lookup. */
const SLOW_AFTER_MS = 1500;

type TranscribeButtonProps = {
  roomId: string;
  eventId: string;
  /** The raw mxc:// url of the audio (content.file?.url ?? content.url). */
  mxc: string;
  /** Key material when the voice note is end-to-end encrypted (content.file). */
  encInfo?: EncryptedAttachmentInfo;
};

/**
 * A per-message action that shows the transcript of a voice/audio message in an
 * app-only popover. The server's automatic transcription has usually already
 * done the note, so its stored text appears instantly; only when nothing is
 * stored does the backend run local Whisper on the spot. A stored draft is
 * swapped for the better version as soon as the server has it.
 *
 * IMPORTANT: the transcript is displayed ONLY inside this client-side popover.
 * It is NEVER sent as a message, posted into the chat, or forwarded anywhere.
 * The returned text is untrusted content and is rendered strictly as text
 * (never as HTML, never evaluated, and no instruction inside it is acted upon).
 */
export function TranscribeButton({ roomId, eventId, mxc, encInfo }: TranscribeButtonProps) {
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
  // Second line of defence: the popover container itself is focusable
  // (tabIndex -1) and is handed to focus-trap as fallbackFocus, so even if a
  // future change made the Close button conditional the trap still has
  // something to hold and cannot throw.
  const menuRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  // Cache the transcript in component state so re-opening does not re-request.
  const [result, setResult] = useState<TranscribeResponse>();
  const [copied, setCopied] = useState(false);
  // Set when the request is taking long enough that it must be a live transcription.
  const [slow, setSlow] = useState(false);
  const [polling, setPolling] = useState(false);
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const poll = useCallback(
    () =>
      fetchStoredTranscript(eventId, roomId, { baseOverride: apiBase, secretOverride: apiSecret }),
    [eventId, roomId, apiBase, apiSecret]
  );
  const onUpdate = useCallback((r: TranscribeResponse) => {
    if (!unmountedRef.current) setResult(r);
  }, []);
  const isCancelled = useCallback(() => unmountedRef.current, []);

  const runTranscription = useCallback(async () => {
    setLoading(true);
    setSlow(false);
    setError(undefined);
    const slowTimer = setTimeout(() => setSlow(true), SLOW_AFTER_MS);
    try {
      await runTranscriptFlow({
        request: async () => {
          try {
            // The default-language setting only matters if the server has to
            // transcribe on the spot; a stored transcript is returned as is.
            return await requestTranscription(
              {
                roomId,
                eventId,
                mxc,
                language: defaultLanguage || undefined,
                file: encInfo
                  ? { url: mxc, key: { k: encInfo.key.k }, iv: encInfo.iv, hashes: encInfo.hashes }
                  : undefined,
              },
              { baseOverride: apiBase, secretOverride: apiSecret }
            );
          } finally {
            clearTimeout(slowTimer);
            if (!unmountedRef.current) {
              setLoading(false);
              setPolling(true);
            }
          }
        },
        poll,
        onUpdate,
        isCancelled,
      });
    } catch (e) {
      const message =
        e instanceof TranscribeError
          ? e.message
          : 'Could not transcribe this message. Please try again.';
      if (!unmountedRef.current) setError(message);
    } finally {
      clearTimeout(slowTimer);
      if (!unmountedRef.current) {
        setLoading(false);
        setPolling(false);
      }
    }
  }, [
    roomId,
    eventId,
    mxc,
    encInfo,
    defaultLanguage,
    apiBase,
    apiSecret,
    poll,
    onUpdate,
    isCancelled,
  ]);

  const resumePolling = useCallback(
    async (from: TranscribeResponse) => {
      setPolling(true);
      try {
        await pollForBetter(from, { poll, onUpdate, isCancelled });
      } finally {
        if (!unmountedRef.current) setPolling(false);
      }
    },
    [poll, onUpdate, isCancelled]
  );

  const handleOpen: MouseEventHandler<HTMLButtonElement> = (evt) => {
    setCopied(false);
    setAnchor(evt.currentTarget.getBoundingClientRect());
    // Only fetch the first time (cache afterwards). Errors are retryable via
    // the retry button inside the popover. A draft whose polling window ran out
    // picks up polling again when the popover is reopened.
    if (!result && !loading) {
      runTranscription();
    } else if (result?.status === 'improving' && !polling && !loading) {
      resumePolling(result);
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
  const described = result ? describeTranscript(result, { polling }) : undefined;
  const busy = loading || (polling && result?.status === 'improving');

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
            initialFocus: () => closeBtnRef.current ?? menuRef.current ?? undefined,
            fallbackFocus: () => menuRef.current ?? document.body,
            onDeactivate: handleClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Menu ref={menuRef} tabIndex={-1} style={{ maxWidth: '100vw', width: 'max-content' }}>
            <Box
              direction="Column"
              gap="200"
              style={{ padding: config.space.S300, maxWidth: '20rem' }}
            >
              <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
                <Box alignItems="Center" gap="200">
                  <Text size="L400">Transcript</Text>
                  {busy && <Spinner size="100" variant="Secondary" />}
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
                  {slow ? 'Transcribing now…' : 'Looking up the automatic transcript…'}
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
                  {described?.progress && (
                    <Text size="T200" priority="300">
                      {described.progress}
                    </Text>
                  )}
                  {described && (
                    <Text size="T200" priority="300">
                      {described.origin}
                    </Text>
                  )}
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
