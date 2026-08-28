import { Icon, Icons, IconSrc, Text, Tooltip, TooltipProvider } from 'folds';
import React from 'react';
import { JoinRule } from '../../types/matrix/room';
import { useClient } from '../hooks/useClient';
import { useObservableValue } from '../hooks/useObservableValue';
import { useRoomJoinRuleLabel } from './JoinRulesSwitcher';

export const getRoomAccessIconSrc = (joinRule?: JoinRule): IconSrc | undefined => {
  if (!joinRule) return Icons.Lock;

  if (joinRule === 'public') return Icons.Globe;
  if (joinRule === 'invite' || joinRule === 'knock' || joinRule === 'private') {
    return Icons.Lock;
  }

  return undefined;
};

export function RoomAccessIndicator({ roomId }: { roomId: string }) {
  const ct = useClient();
  const roomToJoinRule = useObservableValue(ct.roomToJoinRule);

  const ruleToLabels = useRoomJoinRuleLabel();

  const iconSrc = getRoomAccessIconSrc(roomToJoinRule.get(roomId));
  if (!iconSrc) return null;

  return (
    <TooltipProvider
      position="Right"
      align="Center"
      tooltip={
        <Tooltip>
          <Text size="L400">{ruleToLabels[roomToJoinRule.get(roomId) ?? 'private']}</Text>
        </Tooltip>
      }
    >
      {(triggerRef) => <Icon ref={triggerRef} opacity={0.8} src={iconSrc} size="50" />}
    </TooltipProvider>
  );
}
