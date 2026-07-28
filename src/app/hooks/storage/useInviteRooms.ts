import { ObjectReader } from 'neurone/lib/utils';
import { useCallback, useMemo } from 'react';
import { StateEventType } from '../../../types/matrix/room';
import { getMxIdLocalPart } from '../../utils/matrix';
import { useClient } from '../useClient';
import {
  useComputedPendingObservableResult,
  useObservableValue,
  useObservableValuePromise,
} from '../useObservableValue';

export type InviteData = {
  roomId: string;
  roomName: string;
  roomAvatar?: string;
  roomTopic?: string;
  roomAlias?: string;

  senderId: string;
  senderName: string;
  senderAvatar?: string;
  inviteTs?: number;
  reason?: string;

  isSpace: boolean;
  isDirect: boolean;
  isEncrypted: boolean;
};

export const useInviteRooms = () => {
  const ct = useClient();
  const directRooms = useObservableValue(ct.directRooms);
  const roomToName = useObservableValue(ct.roomToName);
  const roomToAvatar = useObservableValue(ct.roomToAvatar);
  const roomToTopic = useObservableValue(ct.roomToTopic);
  const roomToAlias = useObservableValue(ct.roomToAlias);

  const spaceRooms = useObservableValue(ct.spaceRooms);
  const encryptedRooms = useObservableValue(ct.encryptedRooms);

  const invitesStateResult = useObservableValuePromise(
    useMemo(() => ct.storage.inviteRoomState.observableRead.getAll(), [ct])
  );

  const invitesDataResult = useComputedPendingObservableResult(
    invitesStateResult,
    useCallback(
      (stateEventObjs) => {
        const createEvents = stateEventObjs.filter(
          (eventObj) =>
            eventObj.type === StateEventType.RoomCreate && eventObj.event.state_key === ''
        );

        const invites: InviteData[] = createEvents.map((eventObj) => {
          const { roomId } = eventObj;

          const members = stateEventObjs
            .filter((obj) => obj.roomId === roomId && obj.type === StateEventType.RoomMember)
            .map((obj) => obj.event);
          const memberEvent = members.find((member) => member.state_key === ct.session.userId);
          const inviteTs = ObjectReader.number(memberEvent, 'origin_server_ts');
          const reason = ObjectReader.string(memberEvent, 'reason');

          const senderId = memberEvent?.sender;
          const senderEvent = members.find((member) => member.state_key === senderId);
          const senderName =
            senderId &&
            ObjectReader.string(senderEvent?.content, 'displayname') &&
            getMxIdLocalPart(senderId) &&
            senderId;
          const senderAvatar = ObjectReader.string(senderEvent?.content, 'avatar_url');

          const isDirect =
            ObjectReader.boolean(memberEvent?.content, 'is_direct') ?? directRooms.has(roomId);

          const data: InviteData = {
            roomId,
            roomAvatar: roomToAvatar.get(roomId) ?? isDirect ? senderAvatar : undefined,
            roomName: roomToName.get(roomId) ?? roomToAlias.get(roomId) ?? roomId,
            roomTopic: roomToTopic.get(roomId),
            roomAlias: roomToAlias.get(roomId),

            senderId: senderId ?? 'Unknown',
            senderName: senderName ?? 'Unknown',
            senderAvatar,
            inviteTs,
            reason,

            isSpace: spaceRooms.has(roomId),
            isDirect,
            isEncrypted: encryptedRooms.has(roomId),
          };

          return data;
        });

        return invites;
      },
      [
        ct,
        directRooms,
        roomToName,
        roomToAvatar,
        roomToTopic,
        roomToAlias,
        spaceRooms,
        encryptedRooms,
      ]
    )
  );

  return invitesDataResult;
};
