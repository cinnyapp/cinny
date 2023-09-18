import React, { useMemo } from 'react';
import './Room.scss';
import { Room } from 'matrix-js-sdk';
import { Line } from 'folds';
import { useAtomValue } from 'jotai';

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

export type RoomBaseViewProps = {
  room: Room;
  eventId?: string;
  roomTimeline: any;
};
export function RoomBaseView({ room, roomTimeline, eventId }: RoomBaseViewProps) {
  useBindRoomIdToTypingMembersAtom(room.client, roomIdToTypingMembersAtom);

  const [isDrawer] = useSetting(settingsAtom, 'isPeopleDrawer');
  const [screenSize] = useScreenSize();
  const powerLevelAPI = usePowerLevels(room);

  return (
    <PowerLevelsContextProvider value={powerLevelAPI}>
      <div className="room">
        <div className="room__content">
          <RoomSettings roomId={roomTimeline.roomId} />
          <RoomView room={room} roomTimeline={roomTimeline} eventId={eventId} />
        </div>

        {screenSize === ScreenSize.Desktop && isDrawer && (
          <>
            <Line variant="Background" direction="Vertical" size="300" />
            <MembersDrawer room={room} />
          </>
        )}
      </div>
    </PowerLevelsContextProvider>
  );
}
