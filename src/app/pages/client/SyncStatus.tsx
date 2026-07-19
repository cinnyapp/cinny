import React, { ReactNode, useCallback, useEffect, useState } from 'react';
import { Box, config, ContainerColor as ContainerColorType, Line, Text } from 'folds';
import { ContainerColor } from '../../styles/ContainerColor.css';
import { SyncValue } from '../../../client/sync';
import { useClient } from '../../hooks/useClient';
import { getAttemptDelaySec, useRecoveryAttempt } from '../../hooks/useRecoveryAttempt';
import { useSecondsCountdown } from '../../hooks/useSecondsCountdown';
import { useNetworkOnlineCallback } from '../../hooks/useNetwork';

type StatusBarProps = {
  variant: ContainerColorType;
  children: ReactNode;
};
function StatusBar({ variant, children }: StatusBarProps) {
  return (
    <Box direction="Column" shrink="No">
      <Box className={ContainerColor({ variant })} style={{ padding: `${config.space.S100} 0` }}>
        {children}
      </Box>
      <Line variant={variant} size="300" />
    </Box>
  );
}

function RecoverCountdownMessage({
  afterSeconds,
  onEnd,
}: {
  afterSeconds: number;
  onEnd: () => void;
}) {
  const countdownSec = useSecondsCountdown(afterSeconds, onEnd);

  return <span>Reconnecting after {countdownSec} seconds...</span>;
}

// undefined | OK        | undefined | Error     | undefined | OK        | undefined | OK
// undefined | undefined | OK        | undefined | Error     | undefined | OK        | undefined
type StateData = {
  current: SyncValue;
  previous: SyncValue;
};

export function SyncStatus() {
  const ct = useClient();

  const [stateData, setStateData] = useState<StateData>({
    current: ct.sync.observable.read,
    previous: undefined,
  });

  useEffect(() => {
    const unsubscribe = ct.sync.observable.subscribe((syncValue) => {
      setStateData((data) => ({
        current: syncValue,
        previous: data.current,
      }));
    });

    return () => {
      unsubscribe();
    };
  }, [ct]);

  const [previousError] = stateData.previous ?? [];
  const [currentError, currentResult] = stateData.current ?? [];
  if (currentError) {
    console.error(currentError);
  }

  const connecting = stateData.previous === undefined && stateData.current === undefined;
  const recovering = previousError && stateData.current === undefined;

  const recoverAttempt = useRecoveryAttempt(!!currentError, !!currentResult);

  const handleRecover = useCallback(() => ct.sync.controller.recover(), [ct]);

  useNetworkOnlineCallback(handleRecover);

  if (connecting) {
    return (
      <StatusBar variant="Success">
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Text size="T200">
            <b>Connecting...</b>
          </Text>
        </Box>
      </StatusBar>
    );
  }

  if (recovering) {
    return (
      <StatusBar variant="Warning">
        <Box grow="Yes" alignItems="Center" justifyContent="Center">
          <Text size="T200">
            <b>Connection Lost! Reconnecting...</b>
          </Text>
        </Box>
      </StatusBar>
    );
  }

  if (currentError) {
    return (
      <StatusBar variant="Critical">
        <Box grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
          <Text size="T200">
            Connection Lost!{' '}
            <RecoverCountdownMessage
              afterSeconds={getAttemptDelaySec(recoverAttempt)}
              onEnd={handleRecover}
            />
          </Text>
          <Box
            style={{ cursor: 'pointer' }}
            as="button"
            type="button"
            gap="100"
            onClick={() => handleRecover()}
          >
            <Text as="a" size="B300">
              Retry
            </Text>
          </Box>
        </Box>
      </StatusBar>
    );
  }

  return null;
}
