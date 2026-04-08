import React, { useEffect, useCallback } from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('uiaStages');
  return (
    <Dialog>
      <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
        <Box direction="Column" gap="100">
          <Text size="H4">{title}</Text>
          <Text>{message}</Text>
        </Box>
        <Button variant="Critical" onClick={onRetry}>
          <Text as="span" size="B400">
            {t('retry', { defaultValue: 'Retry' })}
          </Text>
        </Button>
        <Button variant="Critical" fill="None" outlined onClick={onCancel}>
          <Text as="span" size="B400">
            {t('cancel', { defaultValue: 'Cancel' })}
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}

export function AutoDummyStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
  const { t } = useTranslation('uiaStages');
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
        message={error ?? t('failedToRegister', { defaultValue: 'Failed to register.' })}
        onRetry={handleSubmit}
        onCancel={onCancel}
      />
    );
  }

  return null;
}
