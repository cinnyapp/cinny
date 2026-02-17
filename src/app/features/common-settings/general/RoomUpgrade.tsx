import React, { useCallback, useEffect, useState } from 'react';
import {
  Button,
  color,
  Spinner,
  Text,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Dialog,
  Header,
  config,
  Box,
  IconButton,
  Icon,
  Icons,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { MatrixError, Method } from 'matrix-js-sdk';
import { RoomTombstoneEventContent } from 'matrix-js-sdk/lib/types';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { IRoomCreateContent, StateEvent } from '../../../../types/matrix/room';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { useRoomNavigate } from '../../../hooks/useRoomNavigate';
import { useCapabilities } from '../../../hooks/useCapabilities';
import { stopPropagation } from '../../../utils/keyboard';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';
import {
  AdditionalCreatorInput,
  RoomVersionSelector,
  useAdditionalCreators,
} from '../../../components/create-room';
import { useAlive } from '../../../hooks/useAlive';
import { creatorsSupported } from '../../../utils/matrix';
import { useRoomCreators } from '../../../hooks/useRoomCreators';
import { BreakWord } from '../../../styles/Text.css';

function RoomUpgradeDialog({ requestClose }: { requestClose: () => void }) {
  const mx = useMatrixClient();
  const room = useRoom();
  const alive = useAlive();
  const creators = useRoomCreators(room);

  const createEvent = useStateEvent(room, StateEvent.RoomCreate);
  const createContent = createEvent?.getContent() as IRoomCreateContent | undefined;
  const currentRoomVersion = createContent?.room_version ?? '1';
  const capabilities = useCapabilities();
  const roomVersions = capabilities['m.room_versions'];
  const [selectedRoomVersion, selectRoomVersion] = useState(currentRoomVersion);

  useEffect(() => {
    if (currentRoomVersion) {
      selectRoomVersion(currentRoomVersion);
    }
  }, [currentRoomVersion]);

  const allowAdditionalCreators = creatorsSupported(selectedRoomVersion);
  const { additionalCreators, addAdditionalCreator, removeAdditionalCreator } =
    useAdditionalCreators(Array.from(creators));

  const [upgradeState, upgrade] = useAsyncCallback(
    useCallback(
      async (version: string, newAdditionalCreators?: string[]) => {
        await mx.http.authedRequest(Method.Post, `/rooms/${room.roomId}/upgrade`, undefined, {
          new_version: version,
          additional_creators: newAdditionalCreators,
        });
      },
      [mx, room]
    )
  );

  const upgrading = upgradeState.status === AsyncStatus.Loading;

  const handleUpgradeRoom = () => {
    const version = selectedRoomVersion;

    upgrade(version, allowAdditionalCreators ? additionalCreators : undefined).then(() => {
      if (alive()) {
        requestClose();
      }
    });
  };

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap
          focusTrapOptions={{
            initialFocus: false,
            onDeactivate: requestClose,
            clickOutsideDeactivates: true,
            escapeDeactivates: stopPropagation,
          }}
        >
          <Dialog variant="Surface">
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
                borderBottomWidth: config.borderWidth.B300,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">{room.isSpaceRoom() ? 'Space Upgrade' : 'Room Upgrade'}</Text>
              </Box>
              <IconButton size="300" onClick={requestClose} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
              <Text priority="400" style={{ color: color.Critical.Main }}>
                <b>This action is irreversible!</b>
              </Text>
              <Box direction="Column" gap="100">
                <Text size="L400">Options</Text>
                <RoomVersionSelector
                  versions={roomVersions?.available ? Object.keys(roomVersions.available) : ['1']}
                  value={selectedRoomVersion}
                  onChange={selectRoomVersion}
                  disabled={upgrading}
                />
                {allowAdditionalCreators && (
                  <SequenceCard
                    style={{ padding: config.space.S300 }}
                    variant="SurfaceVariant"
                    direction="Column"
                    gap="500"
                  >
                    <AdditionalCreatorInput
                      additionalCreators={additionalCreators}
                      onSelect={addAdditionalCreator}
                      onRemove={removeAdditionalCreator}
                      disabled={upgrading}
                    />
                  </SequenceCard>
                )}
              </Box>
              {upgradeState.status === AsyncStatus.Error && (
                <Text className={BreakWord} style={{ color: color.Critical.Main }} size="T200">
                  {(upgradeState.error as MatrixError).message}
                </Text>
              )}
              <Button
                onClick={handleUpgradeRoom}
                variant="Secondary"
                disabled={upgrading}
                before={upgrading && <Spinner size="200" variant="Secondary" fill="Solid" />}
              >
                <Text size="B400">{room.isSpaceRoom() ? 'Upgrade Space' : 'Upgrade Room'}</Text>
              </Button>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type RoomUpgradeProps = {
  permissions: RoomPermissionsAPI;
  requestClose: () => void;
};
export function RoomUpgrade({ permissions, requestClose }: RoomUpgradeProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const { navigateRoom, navigateSpace } = useRoomNavigate();
  const createContent = useStateEvent(
    room,
    StateEvent.RoomCreate
  )?.getContent<IRoomCreateContent>();
  const roomVersion = createContent?.room_version ?? '1';
  const predecessorRoomId = createContent?.predecessor?.room_id;

  const tombstoneContent = useStateEvent(
    room,
    StateEvent.RoomTombstone
  )?.getContent<RoomTombstoneEventContent>();
  const replacementRoom = tombstoneContent?.replacement_room;

  const canUpgrade = permissions.stateEvent(StateEvent.RoomTombstone, mx.getSafeUserId());

  const handleOpenRoom = () => {
    if (replacementRoom) {
      requestClose();
      if (room.isSpaceRoom()) {
        navigateSpace(replacementRoom);
      } else {
        navigateRoom(replacementRoom);
      }
    }
  };

  const handleOpenOldRoom = () => {
    if (predecessorRoomId) {
      requestClose();
      if (room.isSpaceRoom()) {
        navigateSpace(predecessorRoomId);
      } else {
        navigateRoom(predecessorRoomId, createContent.predecessor?.event_id);
      }
    }
  };

  const [prompt, setPrompt] = useState(false);

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={room.isSpaceRoom() ? 'Upgrade Space' : 'Upgrade Room'}
        description={
          replacementRoom
            ? tombstoneContent.body ||
              `This ${room.isSpaceRoom() ? 'space' : 'room'} has been replaced!`
            : `Current version: ${roomVersion}.`
        }
        after={
          <Box alignItems="Center" gap="200">
            {predecessorRoomId && (
              <Button
                size="300"
                variant="Secondary"
                fill="Soft"
                outlined
                radii="300"
                onClick={handleOpenOldRoom}
              >
                <Text size="B300">{room.isSpaceRoom() ? 'Old Space' : 'Old Room'}</Text>
              </Button>
            )}
            {replacementRoom ? (
              <Button
                size="300"
                variant="Success"
                fill="Solid"
                radii="300"
                onClick={handleOpenRoom}
              >
                <Text size="B300">{room.isSpaceRoom() ? 'Open New Space' : 'Open New Room'}</Text>
              </Button>
            ) : (
              <Button
                size="300"
                variant="Secondary"
                fill="Solid"
                radii="300"
                disabled={!canUpgrade}
                onClick={() => setPrompt(true)}
              >
                <Text size="B300">Upgrade</Text>
              </Button>
            )}
          </Box>
        }
      >
        {prompt && <RoomUpgradeDialog requestClose={() => setPrompt(false)} />}
      </SettingTile>
    </SequenceCard>
  );
}
