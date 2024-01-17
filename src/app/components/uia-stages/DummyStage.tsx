import React, { useEffect, useCallback } from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import { StageComponentProps } from './types';

function DummyErrorDialog({
  title,
  message,
  onRetry,
  onCancel,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog>
      <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
        <Box direction="Column" gap="100">
          <Text size="H4">{title}</Text>
          <Text>{message}</Text>
        </Box>
        <Button variant="Critical" onClick={onRetry}>
          <Text as="span" size="B400">
            Retry
          </Text>
        </Button>
        <Button variant="Critical" fill="None" outlined onClick={onCancel}>
          <Text as="span" size="B400">
            Cancel
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}

export function AutoDummyStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(() => {
    submitAuthDict({
      type: AuthType.Dummy,
      session,
    });
  }, [session, submitAuthDict]);

  useEffect(() => {
    if (!errorCode) handleSubmit();
  }, [handleSubmit, errorCode]);

  if (errorCode) {
    return (
      <DummyErrorDialog
        title={errorCode}
        message={error ?? 'Failed to register.'}
        onRetry={handleSubmit}
        onCancel={onCancel}
      />
    );
  }

  return null;
}
