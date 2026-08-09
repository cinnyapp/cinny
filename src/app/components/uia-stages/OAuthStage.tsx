import { Box, Button, color, config, Dialog, Header, Icon, IconButton, Icons, Text } from 'folds';
import React, { useCallback } from 'react';
import { ObjectReader } from 'neurone/lib/utils';
import { StageComponentProps } from './types';

export function OAuthStage({ stageData, submitAuthDict, onCancel }: StageComponentProps) {
  const { errorCode, error, session, info } = stageData;
  const url = ObjectReader.string(info, 'url');

  const handleSubmit = useCallback(() => {
    submitAuthDict({
      session,
    });
  }, [submitAuthDict, session]);

  return (
    <Dialog>
      <Header
        style={{
          padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
        }}
        variant="Surface"
        size="500"
      >
        <Box grow="Yes">
          <Text size="H4">Reset encryption identity</Text>
        </Box>
        <IconButton size="300" onClick={onCancel} radii="300">
          <Icon src={Icons.Cross} />
        </IconButton>
      </Header>

      <Box
        style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
        direction="Column"
        gap="400"
      >
        <Text size="T200">
          To reset your end-to-end encryption cross-signing identity, you need to approve this
          request from your account dashboard.
        </Text>

        <Box direction="Column" gap="100">
          <Text size="T200">
            <b>1.</b> Open your account dashboard and approve the request.
          </Text>
          <Text size="T200">
            <b>2.</b> Return here after approving and Continue.
          </Text>
        </Box>

        {errorCode && (
          <Box alignItems="Center" gap="100" style={{ color: color.Critical.Main }}>
            <Icon size="50" src={Icons.Warning} filled />
            <Text size="T200">
              <b>{`${errorCode}: ${error}`}</b>
            </Text>
          </Box>
        )}
        <Box direction="Column" gap="300">
          <Button
            variant="Secondary"
            onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
          >
            <Text as="span" size="B400">
              Open account dashboard
            </Text>
          </Button>
          <Button variant="Primary" onClick={handleSubmit}>
            <Text as="span" size="B400">
              Continue
            </Text>
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
