import React, { useCallback, useRef, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Icon,
  Icons,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Scroll,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import { useAtomValue } from 'jotai';
import FocusTrap from 'focus-trap-react';
import { MatrixError, Room } from 'matrix-js-sdk';
import { Page, PageContent, PageContentCenter, PageHeader } from '../../../components/page';
import { useDirectInvites, useRoomInvites, useSpaceInvites } from '../../../state/hooks/inviteList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { allInvitesAtom } from '../../../state/room-list/inviteList';
import { mDirectAtom } from '../../../state/mDirectList';
import { SequenceCard } from '../../../components/sequence-card';
import { getMemberDisplayName, getRoomAvatarUrl, isDirectInvite } from '../../../utils/room';
import { nameInitials } from '../../../utils/common';
import { RoomAvatar } from '../../../components/room-avatar';
import { addRoomIdToMDirect, getMxIdLocalPart, guessDmRoomUserId } from '../../../utils/matrix';
import { Time } from '../../../components/message';
import { StateEvent } from '../../../../types/matrix/room';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { useElementSizeObserver } from '../../../hooks/useElementSizeObserver';
import { onEnterOrSpace } from '../../../utils/keyboard';
import { RoomTopicViewer } from '../../../components/room-topic-viewer';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';

const COMPACT_CARD_WIDTH = 548;

type InviteCardProps = {
  room: Room;
  userId: string;
  compact?: boolean;
  onNavigate: (roomId: string) => void;
};
function InviteCard({ room, userId, compact, onNavigate }: InviteCardProps) {
  const mx = useMatrixClient();
  const roomName = room.name || room.getCanonicalAlias() || room.roomId;
  const member = room.getMember(userId);
  const memberEvent = member?.events.member;
  const memberTs = memberEvent?.getTs() ?? 0;
  const senderId = memberEvent?.getSender();
  const senderName = senderId
    ? getMemberDisplayName(room, senderId) ?? getMxIdLocalPart(senderId) ?? senderId
    : undefined;

  const topicEvent = useStateEvent(room, StateEvent.RoomTopic);
  const topic = (topicEvent?.getContent().topic as string) || undefined;

  const [viewTopic, setViewTopic] = useState(false);
  const closeTopic = () => setViewTopic(false);
  const openTopic = () => setViewTopic(true);

  const [joinState, join] = useAsyncCallback<void, MatrixError, []>(
    useCallback(async () => {
      const dmUserId = isDirectInvite(room, userId) ? guessDmRoomUserId(room, userId) : undefined;

      await mx.joinRoom(room.roomId);
      if (dmUserId) {
        await addRoomIdToMDirect(mx, room.roomId, dmUserId);
      }
      onNavigate(room.roomId);
    }, [mx, room, userId, onNavigate])
  );
  const [leaveState, leave] = useAsyncCallback<Record<string, never>, MatrixError, []>(
    useCallback(() => mx.leave(room.roomId), [mx, room])
  );

  const joining =
    joinState.status === AsyncStatus.Loading || joinState.status === AsyncStatus.Success;
  const leaving =
    leaveState.status === AsyncStatus.Loading || leaveState.status === AsyncStatus.Success;

  return (
    <SequenceCard
      variant="SurfaceVariant"
      direction="Column"
      gap="200"
      style={{ padding: config.space.S400, paddingTop: config.space.S200 }}
    >
      <Box gap="200" alignItems="Baseline">
        <Box grow="Yes">
          <Text size="T200" priority="300" truncate>
            Invited by <b>{senderName}</b>
          </Text>
        </Box>
        <Box shrink="No">
          <Time size="T200" ts={memberTs} priority="300" />
        </Box>
      </Box>
      <Box gap="300">
        <Avatar size="300">
          <RoomAvatar
            variant="Secondary"
            src={getRoomAvatarUrl(mx, room, 96)}
            alt={roomName}
            renderInitials={() => (
              <Text as="span" size="H6">
                {nameInitials(roomName)}
              </Text>
            )}
          />
        </Avatar>
        <Box direction={compact ? 'Column' : 'Row'} grow="Yes" gap="200">
          <Box grow="Yes" direction="Column" gap="200">
            <Box direction="Column">
              <Text size="T300" truncate>
                <b>{roomName}</b>
              </Text>
              {topic && (
                <Text
                  size="T200"
                  onClick={openTopic}
                  onKeyDown={onEnterOrSpace(openTopic)}
                  tabIndex={0}
                  truncate
                >
                  {topic}
                </Text>
              )}
              <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
                <OverlayCenter>
                  <FocusTrap
                    focusTrapOptions={{
                      initialFocus: false,
                      clickOutsideDeactivates: true,
                      onDeactivate: closeTopic,
                    }}
                  >
                    <RoomTopicViewer
                      name={roomName}
                      topic={topic ?? ''}
                      requestClose={closeTopic}
                    />
                  </FocusTrap>
                </OverlayCenter>
              </Overlay>
            </Box>
            {joinState.status === AsyncStatus.Error && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                {joinState.error.message}
              </Text>
            )}
            {leaveState.status === AsyncStatus.Error && (
              <Text size="T200" style={{ color: color.Critical.Main }}>
                {leaveState.error.message}
              </Text>
            )}
          </Box>
          <Box gap="200" shrink="No" alignItems="Center">
            <Button
              onClick={leave}
              size="300"
              variant="Secondary"
              fill="Soft"
              disabled={joining || leaving}
              before={leaving ? <Spinner variant="Secondary" size="100" /> : undefined}
            >
              <Text size="B300">Decline</Text>
            </Button>
            <Button
              onClick={join}
              size="300"
              variant="Primary"
              fill="Soft"
              outlined
              disabled={joining || leaving}
              before={joining ? <Spinner variant="Primary" fill="Soft" size="100" /> : undefined}
            >
              <Text size="B300">Accept</Text>
            </Button>
          </Box>
        </Box>
      </Box>
    </SequenceCard>
  );
}

export function Invites() {
  const mx = useMatrixClient();
  const userId = mx.getUserId()!;
  const mDirects = useAtomValue(mDirectAtom);
  const directInvites = useDirectInvites(mx, allInvitesAtom, mDirects);
  const spaceInvites = useSpaceInvites(mx, allInvitesAtom);
  const roomInvites = useRoomInvites(mx, allInvitesAtom, mDirects);
  const containerRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(document.body.clientWidth <= COMPACT_CARD_WIDTH);
  useElementSizeObserver(
    useCallback(() => containerRef.current, []),
    useCallback((width) => setCompact(width <= COMPACT_CARD_WIDTH), [])
  );

  const { navigateRoom, navigateSpace } = useRoomNavigate();

  const renderInvite = (roomId: string, handleNavigate: (rId: string) => void) => {
    const room = mx.getRoom(roomId);
    if (!room) return null;
    return (
      <InviteCard
        key={roomId}
        room={room}
        userId={userId}
        compact={compact}
        onNavigate={handleNavigate}
      />
    );
  };

  return (
    <Page>
      <PageHeader>
        <Box grow="Yes" justifyContent="Center" alignItems="Center" gap="200">
          <Icon size="400" src={Icons.Message} />
          <Text size="H3" truncate>
            Invitations
          </Text>
        </Box>
      </PageHeader>
      <Box grow="Yes">
        <Scroll hideTrack visibility="Hover">
          <PageContent>
            <PageContentCenter>
              <Box ref={containerRef} direction="Column" gap="600">
                {directInvites.length > 0 && (
                  <Box direction="Column" gap="200">
                    <Text size="H4">Direct Messages</Text>
                    <Box direction="Column" gap="100">
                      {directInvites.map((roomId) => renderInvite(roomId, navigateRoom))}
                    </Box>
                  </Box>
                )}
                {spaceInvites.length > 0 && (
                  <Box direction="Column" gap="200">
                    <Text size="H4">Spaces</Text>
                    <Box direction="Column" gap="100">
                      {spaceInvites.map((roomId) => renderInvite(roomId, navigateSpace))}
                    </Box>
                  </Box>
                )}
                {roomInvites.length > 0 && (
                  <Box direction="Column" gap="200">
                    <Text size="H4">Rooms</Text>
                    <Box direction="Column" gap="100">
                      {roomInvites.map((roomId) => renderInvite(roomId, navigateRoom))}
                    </Box>
                  </Box>
                )}
              </Box>
            </PageContentCenter>
          </PageContent>
        </Scroll>
      </Box>
    </Page>
  );
}
