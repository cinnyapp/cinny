import React from 'react';
import { Dialog, Text, Box, Button, config } from 'folds';
import { AuthType } from 'matrix-js-sdk';
import ReCAPTCHA from 'react-google-recaptcha';
import { useTranslation } from 'react-i18next';
import { StageComponentProps } from './types';

function ReCaptchaErrorDialog({
  title,
  message,
  onCancel,
}: {
  title: string;
  message: string;
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
        <Button variant="Critical" fill="None" outlined onClick={onCancel}>
          <Text as="span" size="B400">
            {t('cancel', { defaultValue: 'Cancel' })}
          </Text>
        </Button>
      </Box>
    </Dialog>
  );
}

export function ReCaptchaStageDialog({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
  const { t } = useTranslation('uiaStages');
  const { info, session } = stageData;

  const publicKey = info?.public_key;

  const handleChange = (token: string | null) => {
    submitAuthDict({
      type: AuthType.Recaptcha,
      response: token,
      session,
    });
  };

  if (typeof publicKey !== 'string' || !session) {
    return (
      <ReCaptchaErrorDialog
        title={t('invalidDataTitle', { defaultValue: 'Invalid Data' })}
        message={t('invalidRecaptchaData', {
          defaultValue: 'No valid data found to proceed with ReCAPTCHA.',
        })}
        onCancel={onCancel}
      />
    );
  }

  return (
    <Dialog>
      <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
        <Text>
          {t('recaptchaPrompt', { defaultValue: 'Please check the box below to proceed.' })}
        </Text>
        <ReCAPTCHA sitekey={publicKey} onChange={handleChange} />
      </Box>
    </Dialog>
  );
}
