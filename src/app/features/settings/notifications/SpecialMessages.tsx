import React, { useCallback, useMemo } from 'react';
import { Box, Text, Badge } from 'folds';
import { PushRules } from 'neurone/lib/api/types';
import { putPushRuleActions } from 'neurone/lib/api/matrix/client/v3/pushrules';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { useAccountData } from '../../../hooks/storage/useAccountData';
import { AccountDataType, ConditionKind, PushRuleId } from '../../../../types/matrix/accountData';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import { useUserProfile } from '../../../hooks/useUserProfile';
import { getMxIdLocalPart } from '../../../utils/matrix';
import { makePushRuleData, PushRuleData, usePushRule } from '../../../hooks/usePushRule';
import {
  getNotificationModeActions,
  NotificationMode,
  NotificationModeOptions,
  useNotificationModeActions,
} from '../../../hooks/useNotificationMode';
import { NotificationModeSwitcher } from './NotificationModeSwitcher';
import { useClient } from '../../../hooks/useClient';

const NOTIFY_MODE_OPS: NotificationModeOptions = {
  highlight: true,
};
const getDefaultIsUserMention = (userId: string): PushRuleData =>
  makePushRuleData(
    'override',
    PushRuleId.IsUserMention,
    getNotificationModeActions(NotificationMode.NotifyLoud, { highlight: true }),
    [
      {
        kind: ConditionKind.EventPropertyContains,
        key: 'content.m\\.mentions.user_ids',
        value: userId,
      },
    ]
  );

const DefaultContainsDisplayName = makePushRuleData(
  'override',
  PushRuleId.ContainsDisplayName,
  getNotificationModeActions(NotificationMode.NotifyLoud, { highlight: true }),
  [
    {
      kind: ConditionKind.ContainsDisplayName,
    },
  ]
);

const getDefaultContainsUsername = (username: string) =>
  makePushRuleData(
    'content',
    PushRuleId.ContainsUserName,
    getNotificationModeActions(NotificationMode.NotifyLoud, { highlight: true }),
    undefined,
    username
  );

const DefaultIsRoomMention = makePushRuleData(
  'override',
  PushRuleId.IsRoomMention,
  getNotificationModeActions(NotificationMode.Notify, { highlight: true }),
  [
    {
      kind: ConditionKind.EventPropertyIs,
      key: 'content.m\\.mentions.room',
      value: true,
    },
    {
      kind: ConditionKind.SenderNotificationPermission,
      key: 'room',
    },
  ]
);

const DefaultAtRoomNotification = makePushRuleData(
  'override',
  PushRuleId.AtRoomNotification,
  getNotificationModeActions(NotificationMode.Notify, { highlight: true }),
  [
    {
      kind: ConditionKind.EventMatch,
      key: 'content.body',
      pattern: '@room',
    },
    {
      kind: ConditionKind.SenderNotificationPermission,
      key: 'room',
    },
  ]
);

type PushRulesProps = {
  ruleId: PushRuleId;
  pushRules: PushRules;
  defaultPushRuleData: PushRuleData;
};
function MentionModeSwitcher({ ruleId, pushRules, defaultPushRuleData }: PushRulesProps) {
  const ct = useClient();

  const { kind, pushRule } = usePushRule(pushRules, ruleId) ?? defaultPushRuleData;
  const getModeActions = useNotificationModeActions(NOTIFY_MODE_OPS);

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

export function SpecialMessagesNotifications() {
  const ct = useClient();
  const { userId } = ct.session;
  const { displayName } = useUserProfile(userId) ?? {};

  const pushRuleEventResult = useAccountData(AccountDataType.PushRules);
  const pushRules: PushRules | undefined = useMemo(() => {
    if (pushRuleEventResult.pending) return undefined;
    const content = pushRuleEventResult.value?.content as PushRules;
    return content ?? { global: {} };
  }, [pushRuleEventResult]);

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Text size="L400">Special Messages</Text>
        <Box gap="100">
          <Text size="T200">Badge: </Text>
          <Badge radii="300" variant="Success" fill="Solid">
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
          title={`Mention User ID ("${userId}")`}
          after={
            pushRules && (
              <MentionModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.IsUserMention}
                defaultPushRuleData={getDefaultIsUserMention(userId)}
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
          title={`Contains Displayname ${displayName ? `("${displayName}")` : ''}`}
          after={
            pushRules && (
              <MentionModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.ContainsDisplayName}
                defaultPushRuleData={DefaultContainsDisplayName}
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
          title={`Contains Username ("${getMxIdLocalPart(userId)}")`}
          after={
            pushRules && (
              <MentionModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.ContainsUserName}
                defaultPushRuleData={getDefaultContainsUsername(getMxIdLocalPart(userId) ?? userId)}
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
          title="Mention @room"
          after={
            pushRules && (
              <MentionModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.IsRoomMention}
                defaultPushRuleData={DefaultIsRoomMention}
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
          title="Contains @room"
          after={
            pushRules && (
              <MentionModeSwitcher
                pushRules={pushRules}
                ruleId={PushRuleId.AtRoomNotification}
                defaultPushRuleData={DefaultAtRoomNotification}
              />
            )
          }
        />
      </SequenceCard>
    </Box>
  );
}
