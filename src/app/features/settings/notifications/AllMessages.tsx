import React, { useCallback, useMemo } from 'react';
import { Badge, Box, Text } from 'folds';
import { useTranslation } from 'react-i18next';
import { ConditionKind, IPushRules, PushRuleCondition, PushRuleKind, RuleId } from 'matrix-js-sdk';
import { useAccountData } from '../../../hooks/useAccountData';
import { AccountDataEvent } from '../../../../types/matrix/accountData';
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
import { useMatrixClient } from '../../../hooks/useMatrixClient';

const getAllMessageDefaultRule = (
  ruleId: RuleId,
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
    kind: PushRuleKind.Underride,
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
  ruleId: RuleId.DM | RuleId.EncryptedDM | RuleId.Message | RuleId.EncryptedMessage;
  pushRules: IPushRules;
  encrypted?: boolean;
  oneToOne?: boolean;
};
function AllMessagesModeSwitcher({
  ruleId,
  pushRules,
  encrypted = false,
  oneToOne = false,
}: PushRulesProps) {
  const mx = useMatrixClient();
  const defaultPushRuleData = getAllMessageDefaultRule(ruleId, encrypted, oneToOne);
  const { kind, pushRule } = usePushRule(pushRules, ruleId) ?? defaultPushRuleData;
  const getModeActions = useNotificationModeActions();

  const handleChange = useCallback(
    async (mode: NotificationMode) => {
      const actions = getModeActions(mode);
      await mx.setPushRuleActions('global', kind, ruleId, actions);
    },
    [mx, getModeActions, kind, ruleId]
  );

  return <NotificationModeSwitcher pushRule={pushRule} onChange={handleChange} />;
}

export function AllMessagesNotifications() {
  const { t } = useTranslation();
  const pushRulesEvt = useAccountData(AccountDataEvent.PushRules);
  const pushRules = useMemo(
    () => pushRulesEvt?.getContent<IPushRules>() ?? { global: {} },
    [pushRulesEvt]
  );

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Text size="L400">{t('settings.notificationSettings.allMessages')}</Text>
        <Box gap="100">
          <Text size="T200">{t('settings.notificationSettings.badge')}</Text>
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
          title={t('settings.notificationSettings.oneToOneChats')}
          after={<AllMessagesModeSwitcher pushRules={pushRules} ruleId={RuleId.DM} oneToOne />}
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('settings.notificationSettings.oneToOneChatsEncrypted')}
          after={
            <AllMessagesModeSwitcher
              pushRules={pushRules}
              ruleId={RuleId.EncryptedDM}
              encrypted
              oneToOne
            />
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
          title={t('settings.notificationSettings.rooms')}
          after={<AllMessagesModeSwitcher pushRules={pushRules} ruleId={RuleId.Message} />}
        />
      </SequenceCard>
      <SequenceCard
        className={SequenceCardStyle}
        variant="SurfaceVariant"
        direction="Column"
        gap="400"
      >
        <SettingTile
          title={t('settings.notificationSettings.roomsEncrypted')}
          after={
            <AllMessagesModeSwitcher
              pushRules={pushRules}
              ruleId={RuleId.EncryptedMessage}
              encrypted
            />
          }
        />
      </SequenceCard>
    </Box>
  );
}
