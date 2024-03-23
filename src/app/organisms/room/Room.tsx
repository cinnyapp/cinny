import React from 'react';
import './Room.scss';
import { Room } from 'matrix-js-sdk';
import { Line } from 'folds';
import { useParams } from 'react-router-dom';

import RoomView from './RoomView';
import RoomSettings from './RoomSettings';
import { MembersDrawer } from './MembersDrawer';
import { ScreenSize, useScreenSize } from '../../hooks/useScreenSize';
import { useSetting } from '../../state/hooks/settings';
import { settingsAtom } from '../../state/settings';
import { PowerLevelsContextProvider, usePowerLevels } from '../../hooks/usePowerLevels';
import {
  roomIdToTypingMembersAtom,
  useBindRoomIdToTypingMembersAtom,
} from '../../state/typingMembers';
import { useMatrixClient } from '../../hooks/useMatrixClient';
import { useSelectedRoom } from '../../hooks/router/useSelectedRoom';

export type RoomBaseViewProps = {
  room: Room;
  eventId?: string;
};
export function RoomBaseView({ room, eventId }: RoomBaseViewProps) {
  const mx = useMatrixClient();
  useBindRoomIdToTypingMembersAtom(mx, roomIdToTypingMembersAtom);

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const screenSize = useScreenSize();
  const powerLevelAPI = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevelAPI}>
      <div className="room">
        <div className="room__content">
          <RoomSettings roomId={room.roomId} />
          <RoomView room={room} eventId={eventId} />
        </div>

        {screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer key={room.roomId} room={room} />
          </>
        )}
      </div>
    </PowerLevelsContextProvider>
  );
}

export function RoomViewer() {
  const mx = useMatrixClient();
  const roomId = useSelectedRoom();
  const room = mx.getRoom(roomId);
  const { eventId } = useParams();

  if (!room || !roomId) return <p>try joining this room</p>;

  return <RoomBaseView room={room} eventId={eventId} />;
}
