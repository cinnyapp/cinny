import React from 'react';
import { Avatar, Overlay, OverlayBackdrop, OverlayCenter, Text } from 'folds';
import FocusTrap from 'focus-trap-react';
import { useSpace } from '../../hooks/useSpace';
import { RoomAvatar } from '../../components/room-avatar';
import { nameInitials } from '../../utils/common';
import { UseStateProvider } from '../../components/UseStateProvider';
import { RoomTopicViewer } from '../../components/room-topic-viewer';
import * as css from './LobbyHero.css';
import { PageHero } from '../../components/page';
import { onEnterOrSpace, stopPropagation } from '../../utils/keyboard';
import { useMediaAuthentication } from '../../hooks/useMediaAuthentication';
import { useClient } from '../../hooks/useClient';
import { useRoomHeroes } from '../../hooks/storage/useRoomHeros';
import { useGetRoomName } from '../../hooks/storage/useGetRoomName';
import { useGetRoomAvatar } from '../../hooks/storage/useGetRoomAvatar';
import { useRoomTopic } from '../../hooks/storage/useRoomTopic';
import { mxcToHttp } from '../../../client/mxcToHttp';

export function LobbyHero() {
  const ct = useClient();
  const useAuthentication = useMediaAuthentication();
  const spaceId = useSpace();

  const getRoomHeroes = useRoomHeroes();
  const getRoomName = useGetRoomName(getRoomHeroes);
  const getRoomAvatar = useGetRoomAvatar(getRoomHeroes);
  const topic = useRoomTopic(spaceId);

  const avatarMxc = getRoomAvatar(spaceId);
  const avatarUrl = avatarMxc
    ? mxcToHttp(ct.session.baseUrl, avatarMxc, useAuthentication).thumbnail({
        width: 96,
        height: 96,
        method: 'crop',
      })
    : undefined;

  const name = getRoomName(spaceId) ?? 'Unknown';

  return (
    <PageHero
      icon={
        <Avatar size="500">
          <RoomAvatar
            roomId={spaceId}
            src={avatarUrl}
            alt={name}
            renderFallback={() => <Text size="H4">{nameInitials(name)}</Text>}
          />
        </Avatar>
      }
      title={name}
      subTitle={
        topic && (
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
                        escapeDeactivates: stopPropagation,
                      }}
                    >
                      <RoomTopicViewer
                        name={name}
                        topic={topic}
                        requestClose={() => setViewTopic(false)}
                      />
                    </FocusTrap>
                  </OverlayCenter>
                </Overlay>
                <Text
                  as="span"
                  onClick={() => setViewTopic(true)}
                  onKeyDown={onEnterOrSpace(() => setViewTopic(true))}
                  tabIndex={0}
                  className={css.LobbyHeroTopic}
                  size="Inherit"
                  priority="300"
                >
                  {topic}
                </Text>
              </>
            )}
          </UseStateProvider>
        )
      }
    />
  );
}
