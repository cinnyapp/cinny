/**
 * Small, dependency-free helpers shared by every error boundary in the app:
 * remember recent errors, turn one into a copy-pasteable report, copy it.
 *
 * Kept free of React/folds imports so the top-level error page can use it even
 * when the UI kit itself is what broke.
 */

/** Where "Report" sends him: the fork's dashboard card for Cinny issues. */
export const REPORT_URL = 'http://chagai.website:8772/topic/cinny-dev-consolidate';

export type RecordedError = {
  where: string;
  message: string;
  stack?: string;
  componentStack?: string;
  time: string;
};

const MAX_RECORDED = 20;
const recorded: RecordedError[] = [];

declare global {
  interface Window {
    /** The last few errors caught by a boundary — handy from DevTools. */
    cinnyErrors?: RecordedError[];
  }
}

export const toError = (err: unknown): Error => {
  if (err instanceof Error) return err;
  if (typeof err === 'string') return new Error(err);
  try {
    return new Error(JSON.stringify(err));
  } catch {
    return new Error(String(err));
  }
};

export function recordError(where: string, err: unknown, componentStack?: string | null) {
  const error = toError(err);
  const entry: RecordedError = {
    where,
    message: error.message,
    stack: error.stack,
    componentStack: componentStack ?? undefined,
    time: new Date().toISOString(),
  };
  recorded.push(entry);
  if (recorded.length > MAX_RECORDED) recorded.shift();
  if (typeof window !== 'undefined') window.cinnyErrors = recorded;
  // eslint-disable-next-line no-console
  console.error(`[cinny] error caught in "${where}":`, error, componentStack ?? '');
  return entry;
}

export const getRecordedErrors = (): RecordedError[] => recorded.slice();

/** The hashed main bundle this page was built from (e.g. `assets/index-AbC123.js`). */
export function getBundleName(): string {
  if (typeof document === 'undefined') return 'unknown';
  const script = document.querySelector<HTMLScriptElement>('script[type="module"][src*="index-"]');
  const src = script?.getAttribute('src');
  if (!src) return 'dev-server';
  const m = src.match(/assets\/index-[^/]+\.js/);
  return m ? m[0] : src;
}

export function formatErrorReport(where: string, err: unknown, componentStack?: string | null) {
  const error = toError(err);
  const lines = [
    `Cinny error in: ${where}`,
    `Message: ${error.message}`,
    `Time: ${new Date().toISOString()}`,
    `Page: ${typeof window !== 'undefined' ? window.location.href : ''}`,
    `Bundle: ${getBundleName()}`,
    `Browser: ${typeof navigator !== 'undefined' ? navigator.userAgent : ''}`,
    '',
    'Stack:',
    error.stack ?? '(none)',
  ];
  if (componentStack) lines.push('', 'Component stack:', componentStack.trim());
  return lines.join('\n');
}

/** Copy text; works on http pages too (falls back to a hidden textarea). */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** "Report": copy the details, then open the dashboard card in a new tab. */
export async function reportError(where: string, err: unknown, componentStack?: string | null) {
  const copied = await copyText(formatErrorReport(where, err, componentStack));
  try {
    window.open(REPORT_URL, '_blank', 'noopener,noreferrer');
  } catch {
    // popup blocked — the details are on the clipboard anyway
  }
  return copied;
}
