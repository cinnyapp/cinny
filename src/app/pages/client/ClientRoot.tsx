import {
  Box,
  Button,
  config,
  Dialog,
  Icon,
  IconButton,
  Icons,
  Menu,
  MenuItem,
  PopOut,
  RectCords,
  Spinner,
  Text,
} from 'folds';
import { HttpApiEvent, HttpApiEventHandlerMap, MatrixClient } from 'matrix-js-sdk';
import React, { MouseEventHandler, ReactNode, useCallback, useEffect, useState } from 'react';
import FocusTrap from '../../components/focus-trap';
import {
  clearCacheAndReload,
  clearLoginData,
  getLiteState,
  initClient,
  logoutClient,
  stagedStartupEnabled,
  startClient,
} from '../../../client/initMatrix';
import { watchSkippedRooms } from '../../../client/lite-revive';
import { SplashScreen } from '../../components/splash-screen';
import { ServerConfigsLoader } from '../../components/ServerConfigsLoader';
import { CapabilitiesProvider } from '../../hooks/useCapabilities';
import { MediaConfigProvider } from '../../hooks/useMediaConfig';
import { MatrixClientProvider } from '../../hooks/useMatrixClient';
import { SpecVersions } from './SpecVersions';
import { AsyncStatus, useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useSyncState } from '../../hooks/useSyncState';
import { stopPropagation } from '../../utils/keyboard';
import { SyncStatus } from './SyncStatus';
import { AuthMetadataProvider } from '../../hooks/useAuthMetadata';
import { getFallbackSession } from '../../state/sessions';
import { getSettings } from '../../state/settings';
import { AutoDiscovery } from './AutoDiscovery';
import { readSnapshot, snapshotForHome } from '../../features/startup-snapshot/snapshot';
import { StartupRoomList } from '../../features/startup-snapshot/StartupRoomList';
import { useReplayProgress } from '../../hooks/useReplayProgress';
import { ReplayStatus } from './ReplayStatus';
import { getReplayState, REPLAY_EVENT, ReplayProgress } from '../../../client/staged-replay';
import { DEGRADED_AT_KEY, noteFirstSyncing, notePrepared } from '../../../client/sync-store-keeper';
import { markStartup } from '../../../client/startup-marks';

const mmss = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${sec < 10 ? '0' : ''}${sec}`;
};

const DEGRADED_KEY = DEGRADED_AT_KEY;
const readDegradedAt = (): number | undefined => {
  try {
    const v = localStorage.getItem(DEGRADED_KEY);
    return v ? Number(v) || undefined : undefined;
  } catch {
    return undefined;
  }
};

type SlowLoadKind = 'first' | 'cleared' | 'degraded';
const SLOW_LOAD_LEAD: Record<SlowLoadKind, string> = {
  first: 'First time in this browser: loading all your chats once',
  // nothing saved, but a chat list from last time: the app's "Clear Cache" (or
  // the browser's site data) removed the saved chats
  cleared: 'Cache cleared: loading all your chats once',
  degraded: 'The saved copy had to be rebuilt: loading all your chats once',
};
/** Honest copy for the one-time full load (nothing saved in this browser). */
const firstLoadNote = (elapsedMs: number, kind: SlowLoadKind, interrupted: boolean) =>
  interrupted
    ? `${
        SLOW_LOAD_LEAD[kind]
      }. It was cut off (page in the background, screen off or offline) and starts over. It only runs while this page stays open and in front: keep it open 2-3 minutes. ${mmss(
        elapsedMs
      )}`
    : `${SLOW_LOAD_LEAD[kind]} (2-3 minutes). Every later start takes seconds. ${mmss(elapsedMs)}`;

function ClientRootLoading({ mx }: { mx?: MatrixClient }) {
  // On accounts with a very large number of rooms, restoring the persisted
  // /sync data can take a long time. Show how many rooms have been restored so
  // far so that the splash screen does not look stuck.
  const [roomCount, setRoomCount] = useState(0);
  const { options, skippedRooms, firstLoad } = getLiteState();
  // a full load downloads every chat: nothing is "skipped" on screen
  const skippedCount = options.enabled && !firstLoad ? skippedRooms.length : 0;
  const replay = useReplayProgress(mx);
  // one-time full load: say so, with a clock, instead of looking stuck
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [degradedAt] = useState(readDegradedAt);
  const slowLoad = firstLoad || (degradedAt !== undefined && Date.now() - degradedAt < 120_000);
  useEffect(() => {
    if (!slowLoad) return undefined;
    const id = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(id);
  }, [slowLoad, startedAt]);
  let progressLine: string | undefined;
  if (replay.total > 0) {
    progressLine = `${replay.done.toLocaleString()} of ${replay.total.toLocaleString()} chats`;
  } else if (roomCount > 0) {
    progressLine = `${roomCount.toLocaleString()} chats loaded`;
  }
  // The chat list from last time, drawn in the very first render
  // (features/startup-snapshot) — instead of a bare spinner.
  const [snapshot] = useState(() => {
    const userId = getFallbackSession()?.userId;
    // only what the real Home will show with today's settings, so nothing flashes and vanishes
    return userId
      ? snapshotForHome(readSnapshot(userId), getSettings().homeShowsAllRooms)
      : undefined;
  });
  let slowKind: SlowLoadKind = 'degraded';
  if (firstLoad) slowKind = snapshot ? 'cleared' : 'first';
  // the full /sync was cut off (tab in the background, device slept, network
  // gone): say so instead of a clock that pretends to be loading. Sticky: the
  // SDK stays RECONNECTING while its retry runs, so "cut off, starts over" is
  // true both while paused and after the page is back in front.
  const [interrupted, setInterrupted] = useState(false);
  useSyncState(
    mx,
    useCallback((state) => {
      if (state === 'RECONNECTING' || state === 'ERROR') setInterrupted(true);
    }, [])
  );
  const note = slowLoad ? firstLoadNote(elapsed, slowKind, interrupted) : undefined;

  useEffect(() => {
    if (!mx) return undefined;
    const update = () => setRoomCount(mx.getRooms().length);
    update();
    const intervalId = setInterval(update, 1000);
    return () => clearInterval(intervalId);
  }, [mx]);

  if (snapshot) {
    return (
      <StartupRoomList
        snapshot={snapshot}
        loaded={Math.max(roomCount, replay.done)}
        skipped={skippedCount}
        note={note}
      />
    );
  }

  return (
    <SplashScreen>
      <Box direction="Column" grow="Yes" alignItems="Center" justifyContent="Center" gap="400">
        <Spinner variant="Secondary" size="600" />
        <Text>Heating up</Text>
        {note && (
          <Text
            size="T200"
            priority="300"
            data-testid="startup-note"
            style={{ maxWidth: 420, textAlign: 'center' }}
          >
            {note}
          </Text>
        )}
        {progressLine && (
          <Text size="T200" priority="300" data-testid="startup-progress">
            {progressLine}
          </Text>
        )}
        {skippedCount > 0 && (
          <Text size="T200" priority="300">{`${skippedCount} older chats skipped`}</Text>
        )}
      </Box>
    </SplashScreen>
  );
}

function ClientRootOptions({ mx }: { mx?: MatrixClient }) {
  const [menuAnchor, setMenuAnchor] = useState<RectCords>();

  const handleToggle: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const cords = evt.currentTarget.getBoundingClientRect();
    setMenuAnchor((currentState) => {
      if (currentState) return undefined;
      return cords;
    });
  };

  return (
    <IconButton
      style={{
        position: 'absolute',
        top: config.space.S100,
        right: config.space.S100,
      }}
      variant="Background"
      fill="None"
      onClick={handleToggle}
    >
      <Icon size="200" src={Icons.VerticalDots} />
      <PopOut
        anchor={menuAnchor}
        position="Bottom"
        align="End"
        offset={6}
        content={
          <FocusTrap
            focusTrapOptions={{
              initialFocus: false,
              returnFocusOnDeactivate: false,
              onDeactivate: () => setMenuAnchor(undefined),
              clickOutsideDeactivates: true,
              isKeyForward: (evt: KeyboardEvent) => evt.key === 'ArrowDown',
              isKeyBackward: (evt: KeyboardEvent) => evt.key === 'ArrowUp',
              escapeDeactivates: stopPropagation,
            }}
          >
            <Menu>
              <Box direction="Column" gap="100" style={{ padding: config.space.S100 }}>
                {mx && (
                  <MenuItem onClick={() => clearCacheAndReload(mx)} size="300" radii="300">
                    <Text as="span" size="T300" truncate>
                      Clear Cache and Reload
                    </Text>
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    if (mx) {
                      logoutClient(mx);
                      return;
                    }
                    clearLoginData();
                  }}
                  size="300"
                  radii="300"
                  variant="Critical"
                  fill="None"
                >
                  <Text as="span" size="T300" truncate>
                    Logout
                  </Text>
                </MenuItem>
              </Box>
            </Menu>
          </FocusTrap>
        }
      />
    </IconButton>
  );
}

/**
 * Lite mode: a chat that was skipped must still come back when it wakes up.
 */
const useSkippedRoomWatcher = (mx?: MatrixClient) => {
  useEffect(() => {
    if (!mx) return undefined;
    const { options } = getLiteState();
    if (!options.enabled) return undefined;
    return watchSkippedRooms(mx, options.serverFilter);
  }, [mx]);
};

const useLogoutListener = (mx?: MatrixClient) => {
  useEffect(() => {
    const handleLogout: HttpApiEventHandlerMap[HttpApiEvent.SessionLoggedOut] = async () => {
      mx?.stopClient();
      await mx?.clearStores();
      window.localStorage.clear();
      window.location.reload();
    };

    mx?.on(HttpApiEvent.SessionLoggedOut, handleLogout);
    return () => {
      mx?.removeListener(HttpApiEvent.SessionLoggedOut, handleLogout);
    };
  }, [mx]);
};

type ClientRootProps = {
  children: ReactNode;
};
export function ClientRoot({ children }: ClientRootProps) {
  const [loading, setLoading] = useState(true);
  const { baseUrl, userId } = getFallbackSession() ?? {};

  const [loadState, loadMatrix] = useAsyncCallback<MatrixClient, Error, []>(
    useCallback(() => {
      const session = getFallbackSession();
      if (!session) {
        throw new Error('No session Found!');
      }
      return initClient(session);
    }, [])
  );
  const mx = loadState.status === AsyncStatus.Success ? loadState.data : undefined;
  const [startState, startMatrix] = useAsyncCallback<void, Error, [MatrixClient]>(
    useCallback((m) => startClient(m), [])
  );

  useLogoutListener(mx);
  useSkippedRoomWatcher(mx);

  useEffect(() => {
    if (loadState.status === AsyncStatus.Idle) {
      loadMatrix();
    }
  }, [loadState, loadMatrix]);

  // Staged start-up: open the app as soon as the most recent chats are rebuilt
  // (stage 1); the rest streams in behind it. PREPARED below stays the fallback
  // (setting off, SDK wrapper not installed, or a small account).
  // ONLY for the cached replay (a normal refresh): the one-time cold initial sync
  // is chunked too, but there the splash must stay up until PREPARED — with the
  // whole app mounted, every chunk became a multi-second task (9,032 rooms of
  // full state fighting React for the main thread) and the load crawled.
  useEffect(() => {
    if (!mx || !stagedStartupEnabled()) return undefined;
    const current = getReplayState();
    if (current.active && current.fromCache) setLoading(false);
    const onReplay = (p: ReplayProgress) => {
      if (p.stage === 'first' && p.fromCache) setLoading(false);
    };
    const emitter = mx as unknown as {
      on: (ev: string, h: (p: ReplayProgress) => void) => void;
      removeListener: (ev: string, h: (p: ReplayProgress) => void) => void;
    };
    emitter.on(REPLAY_EVENT, onReplay);
    return () => emitter.removeListener(REPLAY_EVENT, onReplay);
  }, [mx]);

  useEffect(() => {
    if (mx && !mx.clientRunning) {
      startMatrix(mx);
    }
  }, [mx, startMatrix]);

  // start-up timeline: the real app (not the instant list) is committed to the DOM
  useEffect(() => {
    if (mx && !loading) markStartup('app-rendered');
  }, [mx, loading]);

  useSyncState(
    mx,
    useCallback((state) => {
      if (state === 'PREPARED') {
        notePrepared();
        setLoading(false);
      }
      if (state === 'SYNCING') noteFirstSyncing();
    }, [])
  );

  return (
    <AutoDiscovery userId={userId!} baseUrl={baseUrl!}>
      <SpecVersions baseUrl={baseUrl!}>
        {mx && <SyncStatus mx={mx} />}
        {mx && !loading && <ReplayStatus mx={mx} />}
        {loading && <ClientRootOptions mx={mx} />}
        {(loadState.status === AsyncStatus.Error || startState.status === AsyncStatus.Error) && (
          <SplashScreen>
            <Box
              direction="Column"
              grow="Yes"
              alignItems="Center"
              justifyContent="Center"
              gap="400"
            >
              <Dialog>
                <Box direction="Column" gap="400" style={{ padding: config.space.S400 }}>
                  {loadState.status === AsyncStatus.Error && (
                    <Text>{`Failed to load. ${loadState.error.message}`}</Text>
                  )}
                  {startState.status === AsyncStatus.Error && (
                    <Text>{`Failed to start. ${startState.error.message}`}</Text>
                  )}
                  <Button variant="Critical" onClick={mx ? () => startMatrix(mx) : loadMatrix}>
                    <Text as="span" size="B400">
                      Retry
                    </Text>
                  </Button>
                </Box>
              </Dialog>
            </Box>
          </SplashScreen>
        )}
        {loading || !mx ? (
          <ClientRootLoading mx={mx} />
        ) : (
          <MatrixClientProvider value={mx}>
            <ServerConfigsLoader>
              {(serverConfigs) => (
                <CapabilitiesProvider value={serverConfigs.capabilities ?? {}}>
                  <MediaConfigProvider value={serverConfigs.mediaConfig ?? {}}>
                    <AuthMetadataProvider value={serverConfigs.authMetadata}>
                      {children}
                    </AuthMetadataProvider>
                  </MediaConfigProvider>
                </CapabilitiesProvider>
              )}
            </ServerConfigsLoader>
          </MatrixClientProvider>
        )}
      </SpecVersions>
    </AutoDiscovery>
  );
}
