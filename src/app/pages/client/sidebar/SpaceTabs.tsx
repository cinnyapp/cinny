import React, { MouseEventHandler } from 'react';
import { useNavigate } from 'react-router-dom';
import { AvatarFallback, AvatarImage, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { useOrphanSpaces } from '../../../state/hooks/roomList';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { getSpaceLobbyPath, joinPathComponent } from '../../pathUtils';
import { SidebarAvatar, SidebarStack, SidebarStackSeparator } from '../../../components/sidebar';
import { RoomUnreadProvider } from '../../../components/RoomUnreadProvider';
import colorMXID from '../../../../util/colorMXID';
import { useSelectedSpace } from '../../../hooks/router/useSelectedSpace';
import { navToActivePathAtom } from '../../../state/navToActivePath';
import { UnreadBadge } from '../../../components/unread-badge';
import { getCanonicalAliasOrRoomId } from '../../../utils/matrix';

export function SpaceTabs() {
  const navigate = useNavigate();
  const mx = useMatrixClient();
  const roomToParents = useAtomValue(roomToParentsAtom);
  const orphanSpaces = useOrphanSpaces(mx, allRoomsAtom, roomToParents);
  const navToActivePath = useAtomValue(navToActivePathAtom);

  const selectedSpaceId = useSelectedSpace();

  const handleSpaceClick: MouseEventHandler<HTMLButtonElement> = (evt) => {
    const target = evt.currentTarget;
    const targetSpaceId = target.getAttribute('data-id');
    if (!targetSpaceId) return;

    const activePath = navToActivePath.get(targetSpaceId);
    if (activePath) {
      navigate(joinPathComponent(activePath));
      return;
    }

    navigate(getSpaceLobbyPath(getCanonicalAliasOrRoomId(mx, targetSpaceId)));
  };

  if (orphanSpaces.length === 0) return null;
  return (
    <>
      <SidebarStackSeparator />
      <SidebarStack>
        {orphanSpaces.map((orphanSpaceId) => {
          const space = mx.getRoom(orphanSpaceId);
          if (!space) return null;

          const avatarUrl = space.getAvatarUrl(mx.baseUrl, 96, 96, 'crop');

          return (
            <RoomUnreadProvider key={orphanSpaceId} roomId={orphanSpaceId}>
              {(unread) => (
                <SidebarAvatar
                  key={orphanSpaceId}
                  dataId={orphanSpaceId}
                  onClick={handleSpaceClick}
                  active={selectedSpaceId === orphanSpaceId}
                  hasCount={unread && unread.total > 0}
                  tooltip={space.name}
                  notificationBadge={() =>
                    unread && <UnreadBadge highlight={unread.highlight > 0} count={unread.total} />
                  }
                  avatarChildren={
                    avatarUrl ? (
                      <AvatarImage src={avatarUrl} alt={space.name} />
                    ) : (
                      <AvatarFallback
                        style={{
                          backgroundColor: colorMXID(orphanSpaceId),
                          color: 'white',
                        }}
                      >
                        <Text size="T500">{space.name[0]}</Text>
                      </AvatarFallback>
                    )
                  }
                />
              )}
            </RoomUnreadProvider>
          );
        })}
      </SidebarStack>
    </>
  );
}
