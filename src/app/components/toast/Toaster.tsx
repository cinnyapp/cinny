import React, { useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAtomValue, useSetAtom } from 'jotai';
import { Box, Icon, IconButton, Icons, Text, color, config, toRem } from 'folds';
import { TOAST_DURATION_MS, Toast, removeToast, toastsAtom } from './toast';

function ToastItem({ toast }: { toast: Toast }) {
  const setToasts = useSetAtom(toastsAtom);
  const onDismiss = useCallback(
    () => setToasts((list) => removeToast(list, toast.id)),
    [setToasts, toast.id]
  );

  useEffect(() => {
    const id = window.setTimeout(onDismiss, TOAST_DURATION_MS);
    return () => window.clearTimeout(id);
  }, [onDismiss]);

  const tone = color[toast.variant];
  return (
    <Box
      role="status"
      alignItems="Center"
      gap="200"
      style={{
        pointerEvents: 'auto',
        maxWidth: toRem(420),
        padding: `${config.space.S200} ${config.space.S200} ${config.space.S200} ${config.space.S400}`,
        borderRadius: config.radii.R400,
        background: tone.Container,
        color: tone.OnContainer,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
      }}
    >
      <Icon size="100" src={toast.variant === 'Success' ? Icons.Check : Icons.Warning} />
      <Box grow="Yes">
        <Text size="T300">{toast.message}</Text>
      </Box>
      <IconButton size="300" radii="300" variant={toast.variant} fill="None" onClick={onDismiss}>
        <Icon size="50" src={Icons.Cross} />
      </IconButton>
    </Box>
  );
}

// Mount once; renders above every overlay.
export function Toaster() {
  const toasts = useAtomValue(toastsAtom);
  if (toasts.length === 0) return null;

  return createPortal(
    <Box
      direction="Column"
      alignItems="Center"
      gap="200"
      style={{
        position: 'fixed',
        left: config.space.S400,
        right: config.space.S400,
        bottom: config.space.S500,
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} />
      ))}
    </Box>,
    document.body
  );
}
