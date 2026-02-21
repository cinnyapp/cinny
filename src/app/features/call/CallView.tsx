/* eslint-disable no-nested-ternary */
import { Room } from 'matrix-js-sdk';
import React, { useContext, useMemo, useCallback, useEffect, useRef } from 'react';
import { Box } from 'folds';
import { useCallState } from '../../pages/client/call/CallProvider';
import {
  PrimaryRefContext,
  BackupRefContext,
} from '../../pages/client/call/PersistentCallContainer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';

function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => func(...args), waitFor);
  };
}

type OriginalStyles = {
  position?: string;
  top?: string;
  left?: string;
  width?: string;
  height?: string;
  zIndex?: string;
  display?: string;
  visibility?: string;
  pointerEvents?: string;
  border?: string;
};

export function CallView({ room }: { room: Room }) {
  const primaryIframeRef = useContext(PrimaryRefContext);
  const backupIframeRef = useContext(BackupRefContext);
  const iframeHostRef = useRef<HTMLDivElement>(null);

  const originalIframeStylesRef = useRef<OriginalStyles | null>(null);
  const { activeCallRoomId, isPrimaryIframe, isChatOpen } = useCallState();
  const isViewingActiveCall = useMemo(
    () => activeCallRoomId !== null && activeCallRoomId === room.roomId,
    [activeCallRoomId, room.roomId]
  );

  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;
  const activeIframeDisplayRef = isPrimaryIframe
    ? isViewingActiveCall
      ? primaryIframeRef
      : backupIframeRef
    : isViewingActiveCall
    ? backupIframeRef
    : primaryIframeRef;

  const applyFixedPositioningToIframe = useCallback(() => {
    const iframeElement = activeIframeDisplayRef?.current;
    const hostElement = iframeHostRef?.current;

    if (iframeElement && hostElement) {
      if (!originalIframeStylesRef.current) {
        const computed = window.getComputedStyle(iframeElement);
        originalIframeStylesRef.current = {
          position: iframeElement.style.position || computed.position,
          top: iframeElement.style.top || computed.top,
          left: iframeElement.style.left || computed.left,
          width: iframeElement.style.width || computed.width,
          height: iframeElement.style.height || computed.height,
          zIndex: iframeElement.style.zIndex || computed.zIndex,
          display: iframeElement.style.display || computed.display,
          visibility: iframeElement.style.visibility || computed.visibility,
          pointerEvents: iframeElement.style.pointerEvents || computed.pointerEvents,
          border: iframeElement.style.border || computed.border,
        };
      }

      const hostRect = hostElement.getBoundingClientRect();

      iframeElement.style.position = 'fixed';
      iframeElement.style.top = `${hostRect.top}px`;
      iframeElement.style.left = `${hostRect.left}px`;
      iframeElement.style.width = `${hostRect.width}px`;
      iframeElement.style.height = `${hostRect.height}px`;
      iframeElement.style.border = 'none';
      iframeElement.style.zIndex = '1000';
      iframeElement.style.display = room.isCallRoom() ? 'block' : 'none';
      iframeElement.style.visibility = 'visible';
      iframeElement.style.pointerEvents = 'auto';
    }
  }, [activeIframeDisplayRef, room]);

  const debouncedApplyFixedPositioning = useCallback(debounce(applyFixedPositioningToIframe, 50), [
    applyFixedPositioningToIframe,
    primaryIframeRef,
    backupIframeRef,
  ]);
  useEffect(() => {
    const iframeElement = activeIframeDisplayRef?.current;
    const hostElement = iframeHostRef?.current;

    if (room.isCallRoom() || (isViewingActiveCall && iframeElement && hostElement)) {
      applyFixedPositioningToIframe();

      const resizeObserver = new ResizeObserver(debouncedApplyFixedPositioning);
      resizeObserver.observe(hostElement);
      window.addEventListener('scroll', debouncedApplyFixedPositioning, true);

      return () => {
        resizeObserver.disconnect();
        window.removeEventListener('scroll', debouncedApplyFixedPositioning, true);

        if (iframeElement && originalIframeStylesRef.current) {
          const originalStyles = originalIframeStylesRef.current;
          (Object.keys(originalStyles) as Array<keyof OriginalStyles>).forEach((key) => {
            if (key in iframeElement.style) {
              iframeElement.style[key as any] = originalStyles[key] || '';
            }
          });
        }
        originalIframeStylesRef.current = null;
      };
    }
  }, [
    activeIframeDisplayRef,
    applyFixedPositioningToIframe,
    debouncedApplyFixedPositioning,
    isPrimaryIframe,
    isViewingActiveCall,
    room,
  ]);

  const isCallViewVisible = room.isCallRoom();

  return (
    <Box
      direction="Column"
      style={{
        width: isChatOpen ? (isMobile ? '50%' : '100%') : '100%',
        display: isCallViewVisible ? (isMobile && isChatOpen ? 'none' : 'flex') : 'none',
      }}
    >
      <div
        ref={iframeHostRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          pointerEvents: 'none',
          display: isCallViewVisible ? 'flex' : 'none',
        }}
      />
    </Box>
  );
}
