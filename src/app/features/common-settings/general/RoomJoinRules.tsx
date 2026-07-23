import React, { useCallback, useMemo } from 'react';
import { color, Text } from 'folds';
import { useAtomValue } from 'jotai';
import { putStateEvent } from 'neurone/lib/api/matrix/client/v3/rooms';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import {
  JoinRulesSwitcher,
  useJoinRuleIcons,
  useRoomJoinRuleLabel,
} from '../../../components/JoinRulesSwitcher';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../../room-settings/styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useRoom } from '../../../hooks/useRoom';
import {
  JoinRule,
  StateEventType,
  AllowCondition,
  JoinRulesContent,
} from '../../../../types/matrix/room';
import { useSpaceOptionally } from '../../../hooks/useSpace';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
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
import { useClient } from '../../../hooks/useClient';
import { useObservableValue } from '../../../hooks/useObservableValue';
import { getRoomStateEventsQuery } from '../../../hooks/storage/useRoomStateEvent';

type RoomJoinRulesProps = {
  permissions: RoomPermissionsAPI;
};
export function RoomJoinRules({ permissions }: RoomJoinRulesProps) {
  const ct = useClient();
  const roomId = useRoom();

  const roomVersion = ct.roomToVersion.read.get(roomId) ?? '1';

  const allowKnockRestricted = knockRestrictedSupported(roomVersion);
  const allowRestricted = restrictedSupported(roomVersion);
  const allowKnock = knockSupported(roomVersion);

  const roomIdToParents = useAtomValue(roomToParentsAtom);
  const spaceId = useSpaceOptionally();
  const subspacesScope = useRecursiveChildSpaceScopeFactory(ct, roomIdToParents);
  const subspaces = useSpaceChildren(allRoomsAtom, spaceId ?? '', subspacesScope);

  const canEdit = permissions.stateEvent(StateEventType.RoomHistoryVisibility, ct.session.userId);

  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);
  const rule: JoinRule = roomToJoinRule.get(roomId) ?? 'invite';

  const joinRules: Array<JoinRule> = useMemo(() => {
    const r: JoinRule[] = ['invite'];
    if (allowKnock) {
      r.push('knock');
    }
    if (allowRestricted && spaceId) {
      r.push('restricted');
    }
    if (allowKnockRestricted && spaceId) {
      r.push('knock_restricted');
    }
    r.push('public');

    return r;
  }, [allowKnockRestricted, allowRestricted, allowKnock, spaceId]);

  const icons = useJoinRuleIcons(ct.roomToType.read.get(roomId));
  const labels = useRoomJoinRuleLabel();

  const [submitState, submit] = useAsyncCallback(
    useCallback(
      async (joinRule: JoinRule) => {
        const allow: AllowCondition[] = [];
        if (joinRule === 'restricted' || joinRule === 'knock_restricted') {
          const roomParents = roomIdToParents.get(roomId);

          const parentEvents = await ct.storage.joinRoomState.read.query(
            getRoomStateEventsQuery(roomId, StateEventType.SpaceParent)
          );
          const parents = parentEvents
            .map((event) => event.event.state_key)
            .filter((parentId) => roomParents?.has(parentId));

          if (parents.length === 0 && spaceId && roomParents) {
            // if no m.space.parent found
            // find parent in current space
            const selectedParents = subspaces.filter((rId) => roomParents.has(rId));
            if (roomParents.has(spaceId)) {
              selectedParents.push(spaceId);
            }
            selectedParents.forEach((pId) => parents.push(pId));
          }
          parents.forEach((parentRoomId) => {
            if (!parentRoomId) return;
            allow.push({
              type: 'm.room_membership',
              room_id: parentRoomId,
            });
          });
        }

        const c: JoinRulesContent = {
          join_rule: joinRule,
        };
        if (allow.length > 0) c.allow = allow;
        const resp = await ct.requestAuthJSON(
          putStateEvent({
            pathParams: { roomId, eventType: StateEventType.RoomJoinRules, stateKey: '' },
            body: c,
          })
        );
        const [err] = await parseMatrixResp(resp);
        if (err) throw new Error(err.data.error ?? err.data.errcode);
      },
      [ct, roomId, spaceId, subspaces, roomIdToParents]
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
        title={ct.spaceRooms.read.has(roomId) ? 'Space Access' : 'Room Access'}
        description={
          ct.spaceRooms.read.has(roomId)
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
            {submitState.error instanceof Error ? submitState.error.message : 'Unknown Error'}
          </Text>
        )}
      </SettingTile>
    </SequenceCard>
  );
}
