import { EventType, Room } from 'matrix-js-sdk';
import React, {
  useContext,
  useCallback,
  useEffect,
  useRef,
  MouseEventHandler,
  useState,
  ReactNode,
} from 'react';
import { Box, Button, config, Spinner, Text } from 'folds';
import { useCallState } from '../../pages/client/call/CallProvider';
import { useCallMembers, useCallSession } from '../../hooks/useCall';

import { CallRefContext } from '../../pages/client/call/PersistentCallContainer';
import { ScreenSize, useScreenSizeContext } from '../../hooks/useScreenSize';
import { useDebounce } from '../../hooks/useDebounce';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { CallViewUser } from './CallViewUser';
import { useRoomNavigate } from '../../hooks/useRoomNavigate';
import { getMemberDisplayName } from '../../utils/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import * as css from './CallView.css';
import { useRoomPermissions } from '../../hooks/useRoomPermissions';
import { useRoomCreators } from '../../hooks/useRoomCreators';
import { usePowerLevelsContext } from '../../hooks/usePowerLevels';
import { useRoomName } from '../../hooks/useRoomMeta';

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

export function CallViewUserGrid({ children }: { children: ReactNode }) {
  return (
    <Box
      className={css.CallViewUserGrid}
      style={{
        maxWidth: React.Children.count(children) === 4 ? '336px' : '503px',
      }}
    >
      {children}
    </Box>
  );
}

export function CallView({ room }: { room: Room }) {
  const callIframeRef = useContext(CallRefContext);
  const iframeHostRef = useRef<HTMLDivElement>(null);

  const originalIframeStylesRef = useRef<OriginalStyles | null>(null);
  const mx = useMatrixClient();

  const [visibleCallNames, setVisibleCallNames] = useState('');

  const powerLevels = usePowerLevelsContext();
  const creators = useRoomCreators(room);

  const roomName = useRoomName(room);
  const permissions = useRoomPermissions(creators, powerLevels);
  const canJoin = permissions.event(EventType.GroupCallMemberPrefix, mx.getSafeUserId());

  const {
    isActiveCallReady,
    activeCallRoomId,
    isChatOpen,
    setActiveCallRoomId,
    hangUp,
    setViewedCallRoomId,
  } = useCallState();

  const isActiveCallRoom = activeCallRoomId === room.roomId;
  const callIsCurrentAndReady = isActiveCallRoom && isActiveCallReady;
  const callSession = useCallSession(room);
  const callMembers = useCallMembers(room, callSession);

  const getName = (userId: string) =>
    getMemberDisplayName(room, userId) ?? getMxIdLocalPart(userId);

  const memberDisplayNames = callMembers.map((callMembership) =>
    getName(callMembership.sender ?? '')
  );

  const { navigateRoom } = useRoomNavigate();
  const screenSize = useScreenSizeContext();
  const isMobile = screenSize === ScreenSize.Mobile;

  const activeIframeDisplayRef = callIframeRef;

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

  const debouncedApplyFixedPositioning = useDebounce(applyFixedPositioningToIframe, {
    wait: 50,
    immediate: false,
  });
  useEffect(() => {
    const iframeElement = activeIframeDisplayRef?.current;
    const hostElement = iframeHostRef?.current;

    if (room.isCallRoom() || (callIsCurrentAndReady && iframeElement && hostElement)) {
      applyFixedPositioningToIframe();

      const resizeObserver = new ResizeObserver(debouncedApplyFixedPositioning);
      if (hostElement) resizeObserver.observe(hostElement);
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

    return undefined;
  }, [
    activeIframeDisplayRef,
    applyFixedPositioningToIframe,
    debouncedApplyFixedPositioning,
    callIsCurrentAndReady,
    room,
  ]);

  const handleJoinVCClick: MouseEventHandler<HTMLElement> = (evt) => {
    if (!canJoin) return;

    if (isMobile) {
      evt.stopPropagation();
      setViewedCallRoomId(room.roomId);
      navigateRoom(room.roomId);
    }
    if (!callIsCurrentAndReady) {
      hangUp();
      setActiveCallRoomId(room.roomId);
    }
  };

  const isCallViewVisible = room.isCallRoom() && (screenSize === ScreenSize.Desktop || !isChatOpen);

  useEffect(() => {
    if (memberDisplayNames.length <= 2) {
      setVisibleCallNames(memberDisplayNames.join(' and '));
    } else {
      const visible = memberDisplayNames.slice(0, 2);
      const remaining = memberDisplayNames.length - 2;

      setVisibleCallNames(
        `${visible.join(', ')}, and ${remaining} other${remaining > 1 ? 's' : ''}`
      );
    }
  }, [memberDisplayNames]);

  return (
    <Box grow="Yes" direction="Column" style={{ display: isCallViewVisible ? 'flex' : 'none' }}>
      <div
        ref={iframeHostRef}
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          pointerEvents: 'none',
          display: callIsCurrentAndReady ? 'flex' : 'none',
        }}
      />
      <Box
        grow="Yes"
        justifyContent="Center"
        alignItems="Center"
        direction="Column"
        gap="300"
        style={{
          display: callIsCurrentAndReady ? 'none' : 'flex',
        }}
      >
        <CallViewUserGrid>
          {callMembers.slice(0, 6).map((callMember) => (
            <CallViewUser key={callMember.membershipID} room={room} callMembership={callMember} />
          ))}
        </CallViewUserGrid>

        <Box
          direction="Column"
          alignItems="Center"
          style={{
            paddingBlock: config.space.S200,
          }}
        >
          <Text
            size="H1"
            style={{
              paddingBottom: config.space.S300,
            }}
          >
            {roomName}
          </Text>
          <Text size="T200">
            {visibleCallNames !== '' ? visibleCallNames : 'No one'}{' '}
            {memberDisplayNames.length > 1 ? 'are' : 'is'} currently in voice
          </Text>
        </Box>
        <Button
          variant="Secondary"
          disabled={!canJoin || isActiveCallRoom}
          onClick={handleJoinVCClick}
        >
          {isActiveCallRoom ? (
            <Box justifyContent="Center" alignItems="Center" gap="200">
              <Spinner />
              <Text size="B500">{activeCallRoomId === room.roomId ? `Joining` : 'Join Voice'}</Text>
            </Box>
          ) : (
            <Text size="B500">{canJoin ? 'Join Voice' : 'Channel Locked'}</Text>
          )}
        </Button>
      </Box>
    </Box>
  );
}
