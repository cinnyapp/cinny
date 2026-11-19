/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import React from 'react';
import { SpaceSettings } from './SpaceSettings';
import { Modal500 } from '../../components/Modal500';
import { useCloseSpaceSettings, useSpaceSettingsState } from '../../state/hooks/spaceSettings';
import { SpaceSettingsState } from '../../state/spaceSettings';
import { RoomProvider } from '../../hooks/useRoom';
import { SpaceProvider } from '../../hooks/useSpace';
import { useClient } from '../../hooks/useClient';
import { useObservableValue } from '../../hooks/useObservableValue';

type RenderSettingsProps = {
  state: SpaceSettingsState;
};
function RenderSettings({ state }: RenderSettingsProps) {
  const { roomId, spaceId, page } = state;
  const closeSettings = useCloseSpaceSettings();

  const ct = useClient();
  const spaceRooms = useObservableValue(ct.spaceRooms);

  if (!spaceRooms.has(roomId)) return null;

  return (
    <Modal500 requestClose={closeSettings}>
      <SpaceProvider value={spaceId ?? null}>
        <RoomProvider value={roomId}>
          <SpaceSettings initialPage={page} requestClose={closeSettings} />
        </RoomProvider>
      </SpaceProvider>
    </Modal500>
  );
}

export function SpaceSettingsRenderer() {
  const state = useSpaceSettingsState();

  if (!state) return null;
  return <RenderSettings state={state} />;
}
