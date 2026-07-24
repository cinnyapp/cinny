import React, { useCallback, useMemo } from 'react';
import { Badge, Box, Text } from 'folds';
import { PushRuleCondition, PushRules } from 'neurone/lib/api/types';
import { putPushRuleActions } from 'neurone/lib/api/matrix/client/v3/pushrules';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { AccountDataType, ConditionKind, PushRuleId } from '../../../../types/matrix/accountData';
import { NotificationModeSwitcher } from './NotificationModeSwitcher';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { PushRuleData, usePushRule } from '../../../hooks/usePushRule';
import {
  getNotificationModeActions,
  NotificationMode,
  useNotificationModeActions,
} from '../../../hooks/useNotificationMode';
import { useClient } from '../../../hooks/useClient';
import { useAccountData } from '../../../hooks/storage/useAccountData';

const getAllMessageDefaultRule = (
  ruleId: PushRuleId,
  encrypted: boolean,
  oneToOne: boolean
): PushRuleData => {
  const conditions: PushRuleCondition[] = [];
  if (oneToOne)
    conditions.push({
      kind: ConditionKind.RoomMemberCount,
      is: '2',
    });
  conditions.push({
    kind: ConditionKind.EventMatch,
    key: 'type',
    pattern: encrypted ? 'm.room.encrypted' : 'm.room.message',
  });

  return {
    kind: 'underride',
    pushRule: {
      rule_id: ruleId,
      default: true,
      enabled: true,
      conditions,
      actions: getNotificationModeActions(NotificationMode.NotifyLoud),
    },
  };
};

type PushRulesProps = {
  ruleId: PushRuleId.DM | PushRuleId.EncryptedDM | PushRuleId.Message | PushRuleId.EncryptedMessage;
  pushRules: PushRules;
  encrypted?: boolean;
  oneToOne?: boolean;
};
function AllMessagesModeSwitcher({
  ruleId,
  pushRules,
  encrypted = false,
  oneToOne = false,
}: PushRulesProps) {
  const ct = useClient();
  const defaultPushRuleData = getAllMessageDefaultRule(ruleId, encrypted, oneToOne);
  const { kind, pushRule } = usePushRule(pushRules, ruleId) ?? defaultPushRuleData;
  const getModeActions = useNotificationModeActions();

  const handleChange = useCallback(
    async (mode: NotificationMode) => {
      const actions = getModeActions(mode);
      const resp = await ct.requestAuthJSON(
        putPushRuleActions({
          pathParams: { scope: 'global', kind, ruleId },
          body: { actions },
        })
      );
      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, getModeActions, kind, ruleId]
  );

  return <NotificationModeSwitcher pushRule={pushRule} onChange={handleChange} />;
}

export function AllMessagesNotifications() {
  const pushRuleEventResult = useAccountData(AccountDataType.PushRules);
  const pushRules: PushRules | undefined = useMemo(() => {
    if (pushRuleEventResult.pending) return undefined;
    const content = pushRuleEventResult.value?.content as PushRules;
    return content ?? { global: {} };
  }, [pushRuleEventResult]);

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Text size="L400">All Messages</Text>
        <Box gap="100">
          <Text size="T200">Badge: </Text>
          <Badge radii="300" variant="Secondary" fill="Solid">
            <Text size="L400">1</Text>
          </Badge>
        </Box>
      </Box>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="1-to-1 Chats"
          after={
            pushRules && (
              <AllMessagesModeSwitcher pushRules={pushRules} ruleId={PushRuleId.DM} oneToOne />
            )
          }
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="1-to-1 Chats (Encrypted)"
          after={
            pushRules && (
              <AllMessagesModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.EncryptedDM}
                encrypted
                oneToOne
              />
            )
          }
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Rooms"
          after={
            pushRules && (
              <AllMessagesModeSwitcher pushRules={pushRules} ruleId={PushRuleId.Message} />
            )
          }
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title="Rooms (Encrypted)"
          after={
            pushRules && (
              <AllMessagesModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.EncryptedMessage}
                encrypted
              />
            )
          }
        />
      </SequenceCard>
    </Box>
  );
}
