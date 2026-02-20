import React, { createContext, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { ClientWidgetApi } from 'matrix-widget-api';
import { Box } from 'folds';
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
import { ThemeKind, useTheme } from '../../../hooks/useTheme';

interface PersistentCallContainerProps {
  children: ReactNode;
}

export const CallRefContext =
  createContext<React.MutableRefObject<HTMLIFrameElement | null> | null>(null);

export function PersistentCallContainer({ children }: PersistentCallContainerProps) {
  const callIframeRef = useRef<HTMLIFrameElement | null>(null);
  const callWidgetApiRef = useRef<ClientWidgetApi | null>(null);
  const callSmallWidgetRef = useRef<SmallWidget | null>(null);

  const {
    activeCallRoomId,
    viewedCallRoomId,
    isChatOpen,
    isActiveCallReady,
    registerActiveClientWidgetApi,
    activeClientWidget,
  } = useCallState();
  const mx = useMatrixClient();
  const clientConfig = useClientConfig();
  const screenSize = useScreenSizeContext();
  const theme = useTheme();
  const isMobile = screenSize === ScreenSize.Mobile;

  /* eslint-disable no-param-reassign */

  const setupWidget = useCallback(
    (
      widgetApiRef: React.MutableRefObject<ClientWidgetApi | null>,
      smallWidgetRef: React.MutableRefObject<SmallWidget | null>,
      iframeRef: React.MutableRefObject<HTMLIFrameElement | null>,
      skipLobby: boolean,
      themeKind: ThemeKind | null,
    ) => {
      if (mx?.getUserId()) {
        if (activeCallRoomId && !isActiveCallReady) {
          const roomIdToSet = activeCallRoomId;

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
              theme: themeKind,
              callIntent: 'audio',
            },
          );

          if (
            callSmallWidgetRef.current?.roomId &&
            activeClientWidget?.roomId &&
            activeClientWidget.roomId === callSmallWidgetRef.current?.roomId
          ) {
            return;
          }

          if (
            iframeRef.current &&
            (!iframeRef.current.src || iframeRef.current.src !== newUrl.toString())
          ) {
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
            false,
            getWidgetData(mx, roomIdToSet, {}, { skipLobby: true, callIntent: 'audio' }),
            roomIdToSet,
          );

          const smallWidget = new SmallWidget(app);
          smallWidgetRef.current = smallWidget;

          const widgetApiInstance = smallWidget.startMessaging(iframeElement);
          widgetApiRef.current = widgetApiInstance;
          registerActiveClientWidgetApi(
            roomIdToSet,
            widgetApiRef.current,
            smallWidget,
            iframeElement,
          );
        }
      }
    },
    [
      mx,
      activeCallRoomId,
      isActiveCallReady,
      clientConfig.elementCallUrl,
      activeClientWidget,
      registerActiveClientWidgetApi,
    ],
  );

  useEffect(() => {
    if (activeCallRoomId) {
      setupWidget(callWidgetApiRef, callSmallWidgetRef, callIframeRef, true, theme.kind);
    }
  }, [
    theme,
    setupWidget,
    callWidgetApiRef,
    callSmallWidgetRef,
    callIframeRef,
    registerActiveClientWidgetApi,
    activeCallRoomId,
    viewedCallRoomId,
    isActiveCallReady,
  ]);

  const memoizedIframeRef = useMemo(() => callIframeRef, [callIframeRef]);

  return (
    <CallRefContext.Provider value={memoizedIframeRef}>
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
              ref={callIframeRef}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                display: 'flex',
                width: '100%',
                height: '100%',
                border: 'none',
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
    </CallRefContext.Provider>
  );
}
