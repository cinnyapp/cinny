import React, { useEffect, useCallback } from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import { useTranslation } from 'react-i18next';
import { StageComponentProps } from './types';

function TermsErrorDialog({
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

export function AutoTermsStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
  const { t } = useTranslation('uiaStages');
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(
    () =>
      submitAuthDict({
        type: AuthType.Terms,
        session,
      }),
    [session, submitAuthDict]
  );

  useEffect(() => {
    if (!errorCode) {
      handleSubmit();
    }
  }, [session, errorCode, handleSubmit]);

  if (errorCode) {
    return (
      <TermsErrorDialog
        title={errorCode}
        message={
          error ??
          t('termsSubmitFailed', { defaultValue: 'Failed to submit Terms and Condition Acceptance.' })
        }
        onRetry={handleSubmit}
        onCancel={onCancel}
      />
    );
  }

  return null;
}
