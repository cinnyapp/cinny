/**
 * Client for the local Whisper transcription backend.
 *
 * The backend exposes `POST /transcribe`. It downloads and (for E2EE rooms)
 * decrypts the audio itself using @me's server-side access, so the frontend
 * only needs to pass identifiers: { room_id, event_id, mxc, language? }.
 *
 * Configuration (no code change required to re-point at the final URL):
 *   - VITE_TRANSCRIBE_API_BASE   Base URL of the backend, e.g.
 *                                "https://mx.chagai.website/apptranscribe" or,
 *                                for on-box dev, "http://<host>:8778". The
 *                                backend listens on port 8778. NOTE: a browser
 *                                on an https (Netlify) page cannot call a plain
 *                                http://<host>:8778 base (mixed content), so
 *                                production should use an https Traefik route —
 *                                hence the https default below. The
 *                                "/transcribe" path is appended automatically.
 *                                Defaults to DEFAULT_TRANSCRIBE_API_BASE below.
 *   - VITE_TRANSCRIBE_API_SECRET Shared secret sent as "Authorization: Bearer
 *                                <secret>". Optional — if unset, the request is
 *                                still sent (the backend also accepts the
 *                                browser's Basic-auth session as a fallback) and
 *                                credentials are included so the session cookie
 *                                travels with the request.
 *
 * Both values can also be overridden at runtime via app settings (see
 * `transcribeApiBase` / `transcribeApiSecret` in state/settings.ts), which take
 * precedence over the env vars when non-empty.
 */

/**
 * Default base URL — an https Traefik path agreed with the backend agent.
 * The backend service itself listens on port 8778 on-box; an https route is
 * required in production so an https Netlify page can reach it without a
 * mixed-content block. Re-point via VITE_TRANSCRIBE_API_BASE or the setting.
 */
export const DEFAULT_TRANSCRIBE_API_BASE = 'https://mx.chagai.website/apptranscribe';

export type TranscribeRequest = {
  roomId: string;
  eventId: string;
  mxc: string;
  /** Optional ISO-639-1 code; empty/undefined => backend auto-detects. */
  language?: string;
};

export type TranscribeResponse = {
  text: string;
  detectedLanguage?: string;
};

export type TranscribeConfig = {
  /** Overrides VITE_TRANSCRIBE_API_BASE when non-empty. */
  baseOverride?: string;
  /** Overrides VITE_TRANSCRIBE_API_SECRET when non-empty. */
  secretOverride?: string;
};

const trimTrailingSlash = (s: string): string => s.replace(/\/+$/, '');

export const getTranscribeApiBase = (config?: TranscribeConfig): string => {
  const override = config?.baseOverride?.trim();
  if (override) return trimTrailingSlash(override);
  const envBase = (import.meta.env.VITE_TRANSCRIBE_API_BASE as string | undefined)?.trim();
  return trimTrailingSlash(envBase || DEFAULT_TRANSCRIBE_API_BASE);
};

const getTranscribeApiSecret = (config?: TranscribeConfig): string | undefined => {
  const override = config?.secretOverride?.trim();
  if (override) return override;
  const envSecret = (import.meta.env.VITE_TRANSCRIBE_API_SECRET as string | undefined)?.trim();
  return envSecret || undefined;
};

export class TranscribeError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = 'TranscribeError';
    this.status = status;
  }
}

/**
 * Request a transcript from the backend. Throws TranscribeError on any
 * non-2xx response or network failure; the caller is expected to catch and
 * render an error state (never crash the app).
 */
export const requestTranscription = async (
  req: TranscribeRequest,
  config?: TranscribeConfig
): Promise<TranscribeResponse> => {
  const url = `${getTranscribeApiBase(config)}/transcribe`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const secret = getTranscribeApiSecret(config);
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }

  const body: Record<string, string> = {
    room_id: req.roomId,
    event_id: req.eventId,
    mxc: req.mxc,
  };
  const language = req.language?.trim();
  if (language) {
    body.language = language;
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      // Include the browser session so the backend's Basic-auth fallback works
      // when no bearer secret is configured.
      credentials: 'include',
    });
  } catch (e) {
    throw new TranscribeError(
      e instanceof Error ? e.message : 'Network error while requesting transcription'
    );
  }

  if (!res.ok) {
    let detail = '';
    try {
      detail = await res.text();
    } catch {
      detail = '';
    }
    throw new TranscribeError(
      `Transcription failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`,
      res.status
    );
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new TranscribeError('Transcription backend returned an invalid response');
  }

  const obj = (data ?? {}) as Record<string, unknown>;
  const text = typeof obj.text === 'string' ? obj.text : '';
  const detectedLanguage =
    typeof obj.detected_language === 'string' ? obj.detected_language : undefined;

  if (!text) {
    throw new TranscribeError('Transcription backend returned no text');
  }

  return { text, detectedLanguage };
};
