import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { logger } from 'matrix-js-sdk/lib/logger';
import { ClientWidgetApi } from 'matrix-widget-api';
import { Box } from 'folds';
import { useParams } from 'react-router-dom';
import { useCallState } from './CallProvider';
import {
  createVirtualWidget,
  SmallWidget,
  getWidgetData,
  getWidgetUrl,
} from '../../../features/call/SmallWidget';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useClientConfig } from '../../../hooks/useClientConfig';
import { ScreenSize, useScreenSizeContext } from '../../../hooks/useScreenSize';

interface PersistentCallContainerProps {
  children: ReactNode;
}

export const PrimaryRefContext = createContext(null);
export const BackupRefContext = createContext(null);

export function PersistentCallContainer({ children }: PersistentCallContainerProps) {
  const primaryIframeRef = useRef<HTMLIFrameElement | null>(null);
  const primaryWidgetApiRef = useRef<ClientWidgetApi | null>(null);
  const primarySmallWidgetRef = useRef<SmallWidget | null>(null);

  const backupIframeRef = useRef<HTMLIFrameElement | null>(null);
  const backupWidgetApiRef = useRef<ClientWidgetApi | null>(null);
  const backupSmallWidgetRef = useRef<SmallWidget | null>(null);
  const {
    activeCallRoomId,
    viewedCallRoomId,
    isChatOpen,
    isCallActive,
    isPrimaryIframe,
    registerActiveClientWidgetApi,
    activeClientWidget,
    registerViewedClientWidgetApi,
    viewedClientWidget,
  } = useCallState();
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const { roomIdOrAlias: viewedRoomId } = useParams();
  const isViewingActiveCall = useMemo(
    () => activeCallRoomId !== null && activeCallRoomId === viewedRoomId,
    [activeCallRoomId, viewedRoomId]
  );
  /* eslint-disable no-param-reassign */

  const setupWidget = useCallback(
    (
      widgetApiRef: { current: ClientWidgetApi },
      smallWidgetRef: { current: SmallWidget },
      iframeRef: { current: { src: string } },
      skipLobby: { toString: () => any }
    ) => {
      if (mx?.getUserId()) {
        if (
          (activeCallRoomId !== viewedCallRoomId && isCallActive) ||
          (activeCallRoomId && !isCallActive) ||
          (!activeCallRoomId && viewedCallRoomId && !isCallActive)
        ) {
          const roomIdToSet = (skipLobby ? activeCallRoomId : viewedCallRoomId) ?? '';
          if (roomIdToSet === '') {
            return;
          }
          const widgetId = `element-call-${roomIdToSet}-${Date.now()}`;
          const newUrl = getWidgetUrl(
            mx,
            roomIdToSet,
            clientConfig.elementCallUrl ?? '',
            widgetId,
            {
              skipLobby: skipLobby.toString(),
              returnToLobby: 'true',
              perParticipantE2EE: 'true',
            }
          );

          if (
            (primarySmallWidgetRef.current?.roomId || backupSmallWidgetRef.current?.roomId) &&
            (skipLobby
              ? activeClientWidget?.roomId &&
                //activeCallRoomId === activeClientWidget.roomId &&
                (activeClientWidget.roomId === primarySmallWidgetRef.current?.roomId ||
                  activeClientWidget.roomId === backupSmallWidgetRef.current?.roomId)
              : viewedClientWidget?.roomId &&
                viewedCallRoomId === viewedClientWidget.roomId &&
                (viewedClientWidget.roomId === primarySmallWidgetRef.current?.roomId ||
                  viewedClientWidget.roomId === backupSmallWidgetRef.current?.roomId))
          ) {
            return;
          }

          if (iframeRef.current && iframeRef.current.src !== newUrl.toString()) {
            iframeRef.current.src = newUrl.toString();
          } else if (iframeRef.current && !iframeRef.current.src) {
            iframeRef.current.src = newUrl.toString();
          }

          const iframeElement = iframeRef.current;
          if (!iframeElement) {
            return;
          }

          const userId = mx.getUserId() ?? '';
          const app = createVirtualWidget(
            mx,
            widgetId,
            userId,
            'Element Call',
            'm.call',
            newUrl,
            true,
            getWidgetData(mx, roomIdToSet, {}, { skipLobby: true }),
            roomIdToSet
          );

          const smallWidget = new SmallWidget(app);
          smallWidgetRef.current = smallWidget;

          const widgetApiInstance = smallWidget.startMessaging(iframeElement);
          widgetApiRef.current = widgetApiInstance;
          if (skipLobby) {
            registerActiveClientWidgetApi(activeCallRoomId, widgetApiRef.current, smallWidget);
          } else {
            registerViewedClientWidgetApi(viewedCallRoomId, widgetApiRef.current, smallWidget);
          }

          widgetApiInstance.once('ready', () => {
            logger.info(`PersistentCallContainer: Widget for ${roomIdToSet} is ready.`);
          });
        }
      }
    },
    [
      mx,
      activeCallRoomId,
      viewedCallRoomId,
      isCallActive,
      clientConfig.elementCallUrl,
      viewedClientWidget,
      activeClientWidget,
      viewedRoomId,
      registerActiveClientWidgetApi,
      registerViewedClientWidgetApi,
    ]
  );

  useEffect(() => {
    if ((activeCallRoomId && !viewedCallRoomId) || (activeCallRoomId && viewedCallRoomId))
      setupWidget(primaryWidgetApiRef, primarySmallWidgetRef, primaryIframeRef, isPrimaryIframe);
    if ((!activeCallRoomId && viewedCallRoomId) || (viewedCallRoomId && activeCallRoomId))
      setupWidget(backupWidgetApiRef, backupSmallWidgetRef, backupIframeRef, !isPrimaryIframe);
  }, [
    setupWidget,
    primaryWidgetApiRef,
    primarySmallWidgetRef,
    primaryIframeRef,
    backupWidgetApiRef,
    backupSmallWidgetRef,
    backupIframeRef,
    registerActiveClientWidgetApi,
    registerViewedClientWidgetApi,
    activeCallRoomId,
    viewedCallRoomId,
    isCallActive,
    isPrimaryIframe,
  ]);

  const memoizedIframeRef = useMemo(() => primaryIframeRef, [primaryIframeRef]);
  const memoizedBackupIframeRef = useMemo(() => backupIframeRef, [backupIframeRef]);

  return (
    <PrimaryRefContext.Provider value={memoizedIframeRef}>
      <BackupRefContext.Provider value={memoizedBackupIframeRef}>
        <Box grow="No">
          <Box
            direction="Column"
            style={{
              position: 'relative',
              zIndex: 0,
              display: isMobile && isChatOpen ? 'none' : 'flex',
              width: isMobile && isChatOpen ? '0%' : '100%',
              height: isMobile && isChatOpen ? '0%' : '100%',
            }}
          >
            <Box
              grow="Yes"
              style={{
                position: 'relative',
              }}
            >
              <iframe
                ref={primaryIframeRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  display: isPrimaryIframe || isViewingActiveCall ? 'flex' : 'none',
                  width: '100%',
                  height: '100%',
                  border: 'none',
                }}
                title="Persistent Element Call"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
                allow="microphone; camera; display-capture; autoplay; clipboard-write;"
                src="about:blank"
              />
              <iframe
                ref={backupIframeRef}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  display: !isPrimaryIframe || isViewingActiveCall ? 'flex' : 'none',
                }}
                title="Persistent Element Call"
                sandbox="allow-forms allow-scripts allow-same-origin allow-popups allow-modals allow-downloads"
                allow="microphone; camera; display-capture; autoplay; clipboard-write;"
                src="about:blank"
              />
            </Box>
          </Box>
        </Box>
        {children}
      </BackupRefContext.Provider>
    </PrimaryRefContext.Provider>
  );
}
