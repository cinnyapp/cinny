import { Box, Button, color, config, Dialog, Header, Icon, IconButton, Icons, Text } from 'folds';
import React, { useCallback, useEffect, useState } from 'react';
import { StageComponentProps } from './types';

export function SSOStage({
  ssoRedirectURL,
  stageData,
  submitAuthDict,
  onCancel,
}: StageComponentProps & {
  ssoRedirectURL: string;
}) {
  const { errorCode, error, session } = stageData;
  const [ssoWindow, setSSOWindow] = useState<Window>();

  const handleSubmit = useCallback(() => {
    submitAuthDict({
      session,
    });
  }, [submitAuthDict, session]);

  const handleContinue = () => {
    const w = window.open(ssoRedirectURL, '_blank');
    setSSOWindow(w ?? undefined);
  };

  useEffect(() => {
    const handleMessage = (evt: MessageEvent) => {
      if (
        evt.origin === new URL(ssoRedirectURL).origin &&
        ssoWindow &&
        evt.data === 'authDone' &&
        evt.source === ssoWindow
      ) {
        ssoWindow.close();
        setSSOWindow(undefined);
        handleSubmit();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [ssoWindow, handleSubmit, ssoRedirectURL]);

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
          <Text size="H4">SSO Login</Text>
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
          To perform this action you need to authenticate yourself by SSO login.
        </Text>
        {errorCode && (
          <Box alignItems="Center" gap="100" style={{ color: color.Critical.Main }}>
            <Icon size="50" src={Icons.Warning} filled />
            <Text size="T200">
              <b>{`${errorCode}: ${error}`}</b>
            </Text>
          </Box>
        )}

        {ssoWindow ? (
          <Button variant="Primary" onClick={handleSubmit}>
            <Text as="span" size="B400">
              Continue
            </Text>
          </Button>
        ) : (
          <Button variant="Primary" onClick={handleContinue}>
            <Text as="span" size="B400">
              Continue with SSO
            </Text>
          </Button>
        )}
      </Box>
    </Dialog>
  );
}
