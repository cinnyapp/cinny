import React, { useCallback, useMemo } from 'react';
import { color, Text } from 'folds';
import { JoinRule, MatrixError, RestrictedAllowType } from 'matrix-js-sdk';
import { RoomJoinRulesEventContent } from 'matrix-js-sdk/lib/types';
import { useAtomValue } from 'jotai';
import {
  ExtendedJoinRules,
  JoinRulesSwitcher,
  useJoinRuleIcons,
  useRoomJoinRuleLabel,
} from '../../../components/JoinRulesSwitcher';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useMatrixClient } from '../../../hooks/useMatrixClient';
import { useRoom } from '../../../hooks/useRoom';
import { StateEvent } from '../../../../types/matrix/room';
import { useStateEvent } from '../../../hooks/useStateEvent';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { getStateEvents } from '../../../utils/room';
import {
  useRecursiveChildSpaceScopeFactory,
  useSpaceChildren,
} from '../../../state/hooks/roomList';
import { allRoomsAtom } from '../../../state/room-list/roomList';
import { roomToParentsAtom } from '../../../state/room/roomToParents';
import {
  knockRestrictedSupported,
  knockSupported,
  restrictedSupported,
} from '../../../utils/matrix';
import { RoomPermissionsAPI } from '../../../hooks/useRoomPermissions';

type RestrictedRoomAllowContent = {
  room_id: string;
  type: RestrictedAllowType;
};

type RoomJoinRulesProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomJoinRules({ permissions }: RoomJoinRulesProps) {
  const mx = useMatrixClient();
  const room = useRoom();
  const allowKnockRestricted = knockRestrictedSupported(room.getVersion());
  const allowRestricted = restrictedSupported(room.getVersion());
  const allowKnock = knockSupported(room.getVersion());

  const roomIdToParents = useAtomValue(roomToParentsAtom);
  const space = useSpaceOptionally();
  const subspacesScope = useRecursiveChildSpaceScopeFactory(mx, roomIdToParents);
  const subspaces = useSpaceChildren(allRoomsAtom, space?.roomId ?? '', subspacesScope);

  const canEdit = permissions.stateEvent(StateEvent.RoomHistoryVisibility, mx.getSafeUserId());

  const joinRuleEvent = useStateEvent(room, StateEvent.RoomJoinRules);
  const content = joinRuleEvent?.getContent<RoomJoinRulesEventContent>();
  const rule: JoinRule = content?.join_rule ?? JoinRule.Invite;

  const joinRules: Array<ExtendedJoinRules> = useMemo(() => {
    const r: ExtendedJoinRules[] = [JoinRule.Invite];
    if (allowKnock) {
      r.push(JoinRule.Knock);
    }
    if (allowRestricted && space) {
      r.push(JoinRule.Restricted);
    }
    if (allowKnockRestricted && space) {
      r.push('knock_restricted');
    }
    r.push(JoinRule.Public);

    return r;
  }, [allowKnockRestricted, allowRestricted, allowKnock, space]);

  const icons = useJoinRuleIcons(room.getType());
  const labels = useRoomJoinRuleLabel();

  const [submitState, submit] = useAsyncCallback(
    useCallback(
      async (joinRule: ExtendedJoinRules) => {
        const allow: RestrictedRoomAllowContent[] = [];
        if (joinRule === JoinRule.Restricted || joinRule === 'knock_restricted') {
          const roomParents = roomIdToParents.get(room.roomId);

          const parents = getStateEvents(room, StateEvent.SpaceParent)
            .map((event) => event.getStateKey())
            .filter((parentId) => typeof parentId === 'string')
            .filter((parentId) => roomParents?.has(parentId));

          if (parents.length === 0 && space && roomParents) {
            // if no m.space.parent found
            // find parent in current space
            const selectedParents = subspaces.filter((rId) => roomParents.has(rId));
            if (roomParents.has(space.roomId)) {
              selectedParents.push(space.roomId);
            }
            selectedParents.forEach((pId) => parents.push(pId));
          }
          parents.forEach((parentRoomId) => {
            if (!parentRoomId) return;
            allow.push({
              type: RestrictedAllowType.RoomMembership,
              room_id: parentRoomId,
            });
          });
        }

        const c: RoomJoinRulesEventContent = {
          join_rule: joinRule as JoinRule,
        };
        if (allow.length > 0) c.allow = allow;
        await mx.sendStateEvent(room.roomId, StateEvent.RoomJoinRules as any, c);
      },
      [mx, room, space, subspaces, roomIdToParents]
    )
  );

  const submitting = submitState.status === AsyncStatus.Loading;

  return (
    <SequenceCard
      className={SequenceCardStyle}
      variant="SurfaceVariant"
      direction="Column"
      gap="400"
    >
      <SettingTile
        title={room.isSpaceRoom() ? 'Space Access' : 'Room Access'}
        description={
          room.isSpaceRoom()
            ? 'Change how people can join the space.'
            : 'Change how people can join the room.'
        }
        after={
          <JoinRulesSwitcher
            icons={icons}
            labels={labels}
            rules={joinRules}
            value={rule}
            onChange={submit}
            disabled={!canEdit || submitting}
            changing={submitting}
          />
        }
      >
        {submitState.status === AsyncStatus.Error && (
          <Text style={{ color: color.Critical.Main }} size="T200">
            {(submitState.error as MatrixError).message}
          </Text>
        )}
      </SettingTile>
    </SequenceCard>
  );
}
