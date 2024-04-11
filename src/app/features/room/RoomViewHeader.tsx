import React from 'react';
import FocusTrap from 'focus-trap-react';
import {
  Box,
  Avatar,
  Text,
  Overlay,
  OverlayCenter,
  OverlayBackdrop,
  IconButton,
  Icon,
  Icons,
  Tooltip,
  TooltipProvider,
} from 'folds';
import { useNavigate } from 'react-router-dom';

import { useStateEvent } from '../../hooks/useStateEvent';
import { PageHeader } from '../../components/page';
import { RoomAvatar } from '../../components/room-avatar';
import { getRoomAvatarUrl } from '../../utils/room';
import { nameInitials } from '../../utils/common';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import { StateEvent } from '../../../types/matrix/room';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useRoom } from '../../hooks/useRoom';
import { useSetSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { useSpaceOptionally } from '../../hooks/useSpace';
import { getHomeSearchPath, getSpaceSearchPath, withSearchParam } from '../../pages/pathUtils';
import { getCanonicalAliasOrRoomId } from '../../utils/matrix';
import { _SearchPathSearchParams } from '../../pages/paths';
import * as css from './RoomViewHeader.css';

export function RoomViewHeader() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const room = useRoom();
  const space = useSpaceOptionally();

  const encryptionEvent = useStateEvent(room, StateEvent.RoomEncryption);
  const ecryptedRoom = !!encryptionEvent;
  const topicEvent = useStateEvent(room, StateEvent.RoomTopic);
  const topic = topicEvent?.getContent().topic as string | undefined | null;

  const setPeopleDrawer = useSetSetting(settingsAtom, 'isPeopleDrawer');

  const handleSearchClick = () => {
    const searchParams: _SearchPathSearchParams = {
      rooms: room.roomId,
    };
    const path = space
      ? getSpaceSearchPath(getCanonicalAliasOrRoomId(mx, space.roomId))
      : getHomeSearchPath();
    navigate(withSearchParam(path, searchParams));
  };

  return (
    <PageHeader>
      <Box grow="Yes" alignItems="Center" gap="300">
        <Avatar size="300">
          <RoomAvatar
            variant="Background"
            src={getRoomAvatarUrl(mx, room, 96)}
            alt={room.name}
            renderInitials={() => <Text size="H5">{nameInitials(room.name)}</Text>}
          />
        </Avatar>
        <Box direction="Column">
          <Text size={topic ? 'H5' : 'H3'} truncate>
            {room.name}
          </Text>
          {topic && (
            <UseStateProvider initial={false}>
              {(viewTopic, setViewTopic) => (
                <>
                  <Overlay open={viewTopic} backdrop={<OverlayBackdrop />}>
                    <OverlayCenter>
                      <FocusTrap
                        focusTrapOptions={{
                          initialFocus: false,
                          clickOutsideDeactivates: true,
                          onDeactivate: () => setViewTopic(false),
                        }}
                      >
                        <RoomTopicViewer
                          name={room.name}
                          topic={topic}
                          requestClose={() => setViewTopic(false)}
                        />
                      </FocusTrap>
                    </OverlayCenter>
                  </Overlay>
                  <Text
                    as="button"
                    type="button"
                    onClick={() => setViewTopic(true)}
                    className={css.HeaderTopic}
                    size="T200"
                    priority="300"
                    truncate
                  >
                    {topic}
                  </Text>
                </>
              )}
            </UseStateProvider>
          )}
        </Box>
      </Box>
      <Box shrink="No">
        {!ecryptedRoom && (
          <TooltipProvider
            position="Bottom"
            offset={4}
            tooltip={
              <Tooltip>
                <Text>Search</Text>
              </Tooltip>
            }
          >
            {(triggerRef) => (
              <IconButton ref={triggerRef} onClick={handleSearchClick}>
                <Icon size="400" src={Icons.Search} />
              </IconButton>
            )}
          </TooltipProvider>
        )}
        <TooltipProvider
          position="Bottom"
          offset={4}
          tooltip={
            <Tooltip>
              <Text>Members</Text>
            </Tooltip>
          }
        >
          {(triggerRef) => (
            <IconButton ref={triggerRef} onClick={() => setPeopleDrawer((drawer) => !drawer)}>
              <Icon size="400" src={Icons.User} />
            </IconButton>
          )}
        </TooltipProvider>
        <TooltipProvider
          position="Bottom"
          align="End"
          offset={4}
          tooltip={
            <Tooltip>
              <Text>More Options</Text>
            </Tooltip>
          }
        >
          {(triggerRef) => (
            <IconButton ref={triggerRef}>
              <Icon size="400" src={Icons.VerticalDots} />
            </IconButton>
          )}
        </TooltipProvider>
      </Box>
    </PageHeader>
  );
}
