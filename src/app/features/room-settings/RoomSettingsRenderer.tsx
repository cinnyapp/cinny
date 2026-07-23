import React from 'react';
import { RoomSettings } from './RoomSettings';
import { Modal500 } from '../../components/Modal500';
import { useCloseRoomSettings, useRoomSettingsState } from '../../state/hooks/roomSettings';
import { RoomSettingsState } from '../../state/roomSettings';
import { RoomProvider } from '../../hooks/useRoom';
import { SpaceProvider } from '../../hooks/useSpace';
import { useClient } from '../../hooks/useClient';
import { useObservableValue } from '../../hooks/useObservableValue';

type RenderSettingsProps = {
  state: RoomSettingsState;
};
function RenderSettings({ state }: RenderSettingsProps) {
  const { roomId, spaceId, page } = state;
  const closeSettings = useCloseRoomSettings();
  const ct = useClient();
  const rooms = useObservableValue(ct.rooms.join);

  if (!rooms.includes(roomId)) return null;

  return (
    <Modal500 requestClose={closeSettings}>
      <SpaceProvider value={spaceId ?? null}>
        <RoomProvider value={roomId}>
          <RoomSettings initialPage={page} requestClose={closeSettings} />
        </RoomProvider>
      </SpaceProvider>
    </Modal500>
  );
}

export function RoomSettingsRenderer() {
  const state = useRoomSettingsState();

  if (!state) return null;
  return <RenderSettings state={state} />;
}
