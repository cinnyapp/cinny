/**
 * Client for the local Whisper transcription backend.
 *
 * The backend exposes `POST /transcribe`. It is LOOKUP FIRST: the server's
 * automatic transcription (the resident daemon) has usually already
 * transcribed the note, and that stored transcript comes back instantly
 * (`source: "daemon"`). Only when nothing is stored does it download (and for
 * E2EE rooms decrypt) the audio and run Whisper live (`source: "live"`).
 * `GET /transcript?event_id=…` is the cheap lookup-only poll used while the
 * daemon is still improving a draft (`status: "improving"`).
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
  /**
   * For voice notes in ENCRYPTED rooms: the attachment's key material
   * (content.file). Synapse only holds the ciphertext of such events, so the
   * backend cannot find the key itself; without this it would run Whisper on
   * encrypted bytes. Sent only to the configured (on-box, Bearer-protected)
   * transcription backend over HTTPS.
   */
  file?: { url: string; key: { k: string }; iv: string; hashes?: Record<string, string> };
};

/** Where a transcript came from (see the backend's lookup order). */
export type TranscriptSource = 'daemon' | 'app' | 'live';

/**
 * done      final text
 * improving a draft; a better version is being made (poll /transcript)
 * pending   the automatic transcription has started but stored nothing yet
 * none      nothing stored (only from /transcript)
 * skipped   the automatic transcription will never do this note
 */
export type TranscriptStatus = 'done' | 'improving' | 'pending' | 'none' | 'skipped';

export type TranscribeResponse = {
  text: string;
  detectedLanguage?: string;
  source?: TranscriptSource;
  /** Whisper model of the stored/returned text, e.g. "large-v3". */
  model?: string;
  /** True when the text went through the server's clean-up pass. */
  polished?: boolean;
  /** When the transcript was made (epoch ms). */
  ts?: number;
  status: TranscriptStatus;
};

const SOURCES: TranscriptSource[] = ['daemon', 'app', 'live'];
const STATUSES: TranscriptStatus[] = ['done', 'improving', 'pending', 'none', 'skipped'];

/**
 * Shape-check a backend JSON payload into a TranscribeResponse. Unknown or
 * malformed fields are dropped; an older backend that only sends
 * {text, detected_language} reads as a finished live transcript.
 */
export const parseTranscriptPayload = (data: unknown): TranscribeResponse => {
  const obj = (data && typeof data === 'object' ? data : {}) as Record<string, unknown>;
  const text = typeof obj.text === 'string' ? obj.text : '';
  const source = SOURCES.find((s) => s === obj.source);
  const rawStatus = STATUSES.find((s) => s === obj.status);
  const status: TranscriptStatus = rawStatus ?? (text ? 'done' : 'none');
  return {
    text,
    detectedLanguage:
      typeof obj.detected_language === 'string' && obj.detected_language
        ? obj.detected_language
        : undefined,
    source,
    model: typeof obj.model === 'string' && obj.model ? obj.model : undefined,
    polished: obj.polished === true,
    ts: typeof obj.ts === 'number' && Number.isFinite(obj.ts) ? obj.ts : undefined,
    status,
  };
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
const authHeaders = (config?: TranscribeConfig): Record<string, string> => {
  const headers: Record<string, string> = {};
  const secret = getTranscribeApiSecret(config);
  if (secret) {
    headers.Authorization = `Bearer ${secret}`;
  }
  return headers;
};

export const requestTranscription = async (
  req: TranscribeRequest,
  config?: TranscribeConfig
): Promise<TranscribeResponse> => {
  const url = `${getTranscribeApiBase(config)}/transcribe`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...authHeaders(config),
  };

  const body: Record<string, string> = {
    room_id: req.roomId,
    event_id: req.eventId,
    mxc: req.mxc,
  };
  const language = req.language?.trim();
  if (language) {
    body.language = language;
  }
  const payload: Record<string, unknown> = { ...body };
  if (req.file) {
    payload.file = {
      url: req.file.url,
      key: { k: req.file.key.k },
      iv: req.file.iv,
      ...(req.file.hashes ? { hashes: req.file.hashes } : {}),
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
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

  const parsed = parseTranscriptPayload(data);
  if (!parsed.text) {
    throw new TranscribeError('Transcription backend returned no text');
  }
  return parsed;
};

/**
 * Lookup-only poll: what the server has stored for this note right now. Never
 * triggers a transcription. Returns undefined on any failure (the caller just
 * keeps the text it already shows).
 */
export const fetchStoredTranscript = async (
  eventId: string,
  roomId: string,
  config?: TranscribeConfig
): Promise<TranscribeResponse | undefined> => {
  const params = new URLSearchParams({ event_id: eventId });
  if (roomId) params.set('room_id', roomId);
  const url = `${getTranscribeApiBase(config)}/transcript?${params.toString()}`;
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: authHeaders(config),
      credentials: 'include',
    });
    if (!res.ok) return undefined;
    return parseTranscriptPayload(await res.json());
  } catch {
    return undefined;
  }
};
