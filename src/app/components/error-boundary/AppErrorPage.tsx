/**
 * The LAST-RESORT error page — only reached when an error escapes every
 * granular <SafeBoundary> (or happens outside them, e.g. in the router itself).
 *
 * Deliberately built from plain elements + inline styles, no folds, so it still
 * renders when the UI kit / theme is what broke.
 */
import React, { useEffect, useState } from 'react';
import { useRouteError } from 'react-router-dom';
import { copyText, formatErrorReport, recordError, REPORT_URL, toError } from './errorReport';

const btn: React.CSSProperties = {
  font: 'inherit',
  padding: '10px 18px',
  borderRadius: 8,
  border: '1px solid #8884',
  background: '#2d6cdf',
  color: '#fff',
  cursor: 'pointer',
};

type AppErrorPageProps = {
  error: unknown;
  where?: string;
  componentStack?: string | null;
};

export function AppErrorPage({ error, where = 'app', componentStack }: AppErrorPageProps) {
  const [copied, setCopied] = useState<'idle' | 'ok' | 'fail'>('idle');
  const err = toError(error);
  const report = formatErrorReport(where, err, componentStack);

  return (
    <div
      role="alert"
      data-app-error-page
      style={{
        minHeight: '100vh',
        boxSizing: 'border-box',
        padding: 24,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        background: '#1a1b1e',
        color: '#e8e8ea',
      }}
    >
      <div style={{ maxWidth: 560, width: '100%' }}>
        <h1 style={{ fontSize: 22, margin: '0 0 8px' }}>
          Cinny hit an error it could not recover from
        </h1>
        <p style={{ margin: '0 0 16px', opacity: 0.85 }}>
          Your messages are safe on the server. Reloading usually fixes this.
        </p>
        <pre
          style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            background: '#0005',
            padding: 12,
            borderRadius: 8,
            fontSize: 13,
            maxHeight: '40vh',
            overflow: 'auto',
          }}
        >
          {err.message}
        </pre>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
          <button type="button" style={btn} onClick={() => window.location.reload()}>
            Reload
          </button>
          <button
            type="button"
            style={{ ...btn, background: 'transparent', color: 'inherit' }}
            onClick={() => copyText(report).then((ok) => setCopied(ok ? 'ok' : 'fail'))}
          >
            {copied === 'idle' && 'Copy error'}
            {copied === 'ok' && 'Copied ✓'}
            {copied === 'fail' && 'Copy failed — select the text above'}
          </button>
          <a
            href={REPORT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...btn, background: 'transparent', color: 'inherit', textDecoration: 'none' }}
          >
            Open the dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

/** React Router `errorElement` for the root route. */
export function RouteErrorPage() {
  const error = useRouteError();
  useEffect(() => {
    recordError('route', error);
  }, [error]);
  return <AppErrorPage error={error} where="route" />;
}

type RootBoundaryState = { error?: unknown; componentStack?: string | null };

/** Outermost boundary (around <App/>), for errors outside the router. */
export class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = {};
  }

  static getDerivedStateFromError(error: unknown): RootBoundaryState {
    return { error };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    recordError('root', error, info.componentStack);
    this.setState({ componentStack: info.componentStack });
  }

  render() {
    const { error, componentStack } = this.state;
    if (error !== undefined) {
      return <AppErrorPage error={error} where="root" componentStack={componentStack} />;
    }
    const { children } = this.props;
    return children;
  }
}
