import { Box, Button, color, config, Dialog, ProgressBar, Text, toRem } from 'folds';
import { ObservableValue } from 'neurone/lib/utils/observable';
import { printMatrixError } from 'neurone/lib/matrix-request';
import React, { ReactNode, useMemo } from 'react';
import { SplashScreen } from '../../components/splash-screen';
import { useObservableValue } from '../../hooks/useObservableValue';
import { createFakeProgress } from '../../../client/responseProgress';
import { bytesToSize } from '../../utils/common';
import { SyncContext, SyncProgress } from '../../../client/sync';
import { ClientRootOptions } from './ClientRootOptions';
import { useClient } from '../../hooks/useClient';

function InitialSyncProgressScreen({
  sync,
  progressObservable,
}: {
  sync: SyncContext;
  progressObservable: ObservableValue<SyncProgress | undefined>;
}) {
  const progress = useObservableValue(progressObservable);
  const getFakeProgress = useMemo(() => createFakeProgress(), []);

  const syncValue = useObservableValue(sync.observable);
  const [syncError] = syncValue ?? [];

  let progressContent: ReactNode;

  if (!progress) {
    progressContent = (
      <>
        <Text size="T200" align="Center">
          Preparing to download your conversations...
        </Text>
        <ProgressBar
          style={{ width: '100%' }}
          variant="Secondary"
          size="300"
          radii="Pill"
          value={0}
          outlined
        />
      </>
    );
  } else if (typeof progress.total === 'number' && progress.total === progress.received) {
    progressContent = (
      <>
        <Text size="T200" align="Center">
          Download complete. Saving conversations...
        </Text>
        <ProgressBar
          style={{ width: '100%' }}
          variant="Success"
          size="300"
          radii="Pill"
          value={0}
          outlined
        />
      </>
    );
  } else {
    progressContent = (
      <>
        <Text size="T200" align="Center">
          Downloading conversations ({bytesToSize(progress.received)})
        </Text>
        <ProgressBar
          style={{ width: '100%' }}
          variant="Secondary"
          size="300"
          radii="Pill"
          value={
            progress.total === undefined ? getFakeProgress(progress.received) : progress.received
          }
          max={progress.total ?? 1}
          outlined
        />
      </>
    );
  }

  return (
    <SplashScreen
      footer={
        !syncError && (
          <Box
            style={{ maxWidth: toRem(280) }}
            direction="Column"
            grow="Yes"
            alignItems="Center"
            gap="200"
          >
            {progressContent}
          </Box>
        )
      }
    >
      {syncError && (
        <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
          <Dialog>
            <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
              <Text style={{ color: color.Critical.Main }}>
                {syncError instanceof Error ? syncError.message : printMatrixError(syncError)}
              </Text>
              <Button variant="Critical" onClick={() => sync.controller.recover()}>
                <Text as="span" size="B400">
                  Retry
                </Text>
              </Button>
            </Box>
          </Dialog>
        </Box>
      )}
    </SplashScreen>
  );
}

export function InitialSyncSplashScreen({ children }: { children: ReactNode }) {
  const ct = useClient();
  const initialSync = useObservableValue(ct.sync.controller.initialSync);

  if (initialSync) {
    return (
      <>
        <ClientRootOptions userId={ct.session.userId} />
        <InitialSyncProgressScreen sync={ct.sync} progressObservable={initialSync.progress} />;
      </>
    );
  }

  return children;
}
