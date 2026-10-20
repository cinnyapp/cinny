/**
 * Granular error boundaries.
 *
 * One broken component (a popover, a single message, a settings page) used to
 * take the WHOLE app down to React Router's "Unexpected Application Error!"
 * page — e.g. the 🎤 Transcribe popover's focus-trap error. Wrapping each such
 * piece in a <SafeBoundary> keeps the failure local: that piece is replaced by
 * a small "Something went wrong here — Retry / Report" box and everything else
 * keeps running.
 *
 * Variants:
 *  - "message": one compact line, used for each timeline item
 *  - "popup":   a small card, used for every PopOut / Dialog / Overlay
 *               (via the shared FocusTrap wrapper), with a Close button
 *  - "panel":   a centred box filling its area (room view, settings page)
 *  - "inline":  a small box (default)
 */
import React, { ReactNode, useCallback, useRef, useState } from 'react';
import { ErrorBoundary, FallbackProps } from 'react-error-boundary';
import { Box, Button, color, config, Text } from 'folds';
import { recordError, reportError, toError } from './errorReport';

export type SafeBoundaryVariant = 'message' | 'popup' | 'panel' | 'inline';

type FallbackUIProps = {
  where: string;
  variant: SafeBoundaryVariant;
  error: unknown;
  componentStack?: string | null;
  onRetry: () => void;
  onClose?: () => void;
};

export function SafeBoundaryFallback({
  where,
  variant,
  error,
  componentStack,
  onRetry,
  onClose,
}: FallbackUIProps) {
  const [reported, setReported] = useState<'idle' | 'copied' | 'failed'>('idle');
  const { message } = toError(error);

  const handleReport = () => {
    reportError(where, error, componentStack).then((ok) => setReported(ok ? 'copied' : 'failed'));
  };

  const compact = variant === 'message';
  const title =
    variant === 'message' ? 'This message could not be shown.' : 'Something went wrong here.';

  const buttons = (
    <Box gap="200" alignItems="Center" wrap="Wrap">
      <Button
        size="300"
        variant="Secondary"
        fill="Soft"
        radii="300"
        onClick={onRetry}
        data-safe-boundary-retry
      >
        <Text size="B300">Retry</Text>
      </Button>
      <Button
        size="300"
        variant="Secondary"
        fill="None"
        radii="300"
        onClick={handleReport}
        title="Copies the error details and opens the dashboard"
      >
        <Text size="B300">
          {reported === 'idle' && 'Report'}
          {reported === 'copied' && 'Copied ✓'}
          {reported === 'failed' && 'Report (copy failed)'}
        </Text>
      </Button>
      {onClose && (
        <Button size="300" variant="Secondary" fill="None" radii="300" onClick={onClose}>
          <Text size="B300">Close</Text>
        </Button>
      )}
    </Box>
  );

  const body = (
    <Box
      role="alert"
      data-safe-boundary={where}
      direction={compact ? 'Row' : 'Column'}
      alignItems={compact ? 'Center' : 'Start'}
      gap="200"
      wrap="Wrap"
      style={{
        padding: compact ? `${config.space.S100} ${config.space.S400}` : config.space.S400,
        borderRadius: config.radii.R300,
        border: `${config.borderWidth.B300} solid ${color.Critical.ContainerLine}`,
        backgroundColor: color.Critical.Container,
        color: color.Critical.OnContainer,
        maxWidth: variant === 'panel' ? '28rem' : '22rem',
        minWidth: compact ? undefined : '14rem',
      }}
    >
      <Box direction="Column" gap="100" grow={compact ? 'Yes' : undefined}>
        <Text size={compact ? 'T200' : 'T300'} style={{ fontWeight: config.fontWeight.W600 }}>
          {title}
        </Text>
        {!compact && (
          <Text size="T200" priority="300" style={{ wordBreak: 'break-word' }}>
            {message}
          </Text>
        )}
        {!compact && (
          <Text size="T200" priority="300">
            The rest of the app keeps working.
          </Text>
        )}
      </Box>
      {buttons}
    </Box>
  );

  if (variant === 'panel') {
    return (
      <Box
        grow="Yes"
        alignItems="Center"
        justifyContent="Center"
        style={{ padding: config.space.S400 }}
      >
        {body}
      </Box>
    );
  }
  return body;
}

/**
 * Static fallback for a message whose renderer threw synchronously (outside any
 * component, so no boundary could catch it). "Retry" re-renders the timeline.
 */
export function MessageRenderFailed({ where, error }: { where: string; error: unknown }) {
  const [, setTick] = useState(0);
  return (
    <SafeBoundaryFallback
      where={where}
      variant="message"
      error={error}
      onRetry={() => setTick((t) => t + 1)}
    />
  );
}

export type SafeBoundaryProps = {
  /** Human name of the area, shown in the report ("transcribe popup", "message $id"...). */
  where: string;
  variant?: SafeBoundaryVariant;
  /** When any of these change the boundary resets itself (e.g. the room id). */
  resetKeys?: unknown[];
  /** Shown as a "Close" button in the fallback (popups). */
  onClose?: () => void;
  children: ReactNode;
};

export function SafeBoundary({
  where,
  variant = 'inline',
  resetKeys,
  onClose,
  children,
}: SafeBoundaryProps) {
  const componentStackRef = useRef<string | null>(null);

  const handleError = useCallback(
    (error: Error, info: { componentStack?: string | null }) => {
      componentStackRef.current = info.componentStack ?? null;
      recordError(where, error, info.componentStack);
    },
    [where]
  );

  const renderFallback = useCallback(
    ({ error, resetErrorBoundary }: FallbackProps) => (
      <SafeBoundaryFallback
        where={where}
        variant={variant}
        error={error}
        componentStack={componentStackRef.current}
        onRetry={resetErrorBoundary}
        onClose={onClose}
      />
    ),
    [where, variant, onClose]
  );

  return (
    <ErrorBoundary fallbackRender={renderFallback} onError={handleError} resetKeys={resetKeys}>
      {children}
    </ErrorBoundary>
  );
}
