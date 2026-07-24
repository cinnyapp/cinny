import React, { ChangeEventHandler, FormEventHandler, useCallback, useMemo, useState } from 'react';
import { Box, Text, Badge, Button, Input, config, IconButton, Icons, Icon, Spinner } from 'folds';
import {
  deletePushRule,
  putPushRule,
  putPushRuleActions,
} from 'neurone/lib/api/matrix/client/v3/pushrules';
import { parseMatrixResp } from 'neurone/lib/matrix-request';
import { PushRule, PushRules } from 'neurone/lib/api/types';
import { useAccountData } from '../../../hooks/storage/useAccountData';
import { AccountDataType } from '../../../../types/matrix/accountData';
import { SequenceCard } from '../../../components/sequence-card';
import { SequenceCardStyle } from '../styles.css';
import { SettingTile } from '../../../components/setting-tile';
import {
  getNotificationModeActions,
  NotificationMode,
  NotificationModeOptions,
  useNotificationModeActions,
} from '../../../hooks/useNotificationMode';
import { NotificationModeSwitcher } from './NotificationModeSwitcher';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useClient } from '../../../hooks/useClient';

const NOTIFY_MODE_OPS: NotificationModeOptions = {
  highlight: true,
};

function KeywordInput() {
  const ct = useClient();
  const [keyword, setKeyword] = useState<string>('');

  const [keywordState, addKeyword] = useAsyncCallback(
    useCallback(
      async (k: string) => {
        const resp = await ct.requestAuthJSON(
          putPushRule({
            pathParams: { scope: 'global', kind: 'content', ruleId: k },
            body: {
              actions: getNotificationModeActions(NotificationMode.Notify, NOTIFY_MODE_OPS),
              pattern: k,
            },
          })
        );

        const [err] = await parseMatrixResp(resp);
        if (err) throw new Error(err.data.error ?? err.data.errcode);
        setKeyword('');
      },
      [ct]
    )
  );
  const addingKeyword = keywordState.status === AsyncStatus.Loading;

  const handleChange: ChangeEventHandler<HTMLInputElement> = (evt) => {
    const k = evt.currentTarget.value;
    setKeyword(k);
  };

  const handleReset = () => {
    setKeyword('');
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    if (addingKeyword) return;

    const target = evt.target as HTMLFormElement | undefined;
    const keywordInput = target?.keywordInput as HTMLInputElement | undefined;
    const k = keywordInput?.value.trim();
    if (!k) return;

    addKeyword(k);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} gap="200" aria-disabled={addingKeyword}>
      <Box grow="Yes" direction="Column">
        <Input
          required
          name="keywordInput"
          value={keyword}
          onChange={handleChange}
          variant="Secondary"
          radii="300"
          style={{ paddingRight: config.space.S200 }}
          readOnly={addingKeyword}
          after={
            keyword &&
            !addingKeyword && (
              <IconButton
                type="reset"
                onClick={handleReset}
                size="300"
                radii="300"
                variant="Secondary"
              >
                <Icon src={Icons.Cross} size="100" />
              </IconButton>
            )
          }
        />
      </Box>
      <Button
        size="400"
        variant="Secondary"
        fill="Soft"
        outlined
        radii="300"
        type="submit"
        disabled={addingKeyword}
      >
        {addingKeyword && <Spinner variant="Secondary" size="300" />}
        <Text size="B400">Save</Text>
      </Button>
    </Box>
  );
}

type PushRulesProps = {
  pushRule: PushRule;
};

function KeywordCross({ pushRule }: PushRulesProps) {
  const ct = useClient();
  const [removeState, remove] = useAsyncCallback(
    useCallback(
      () =>
        ct.requestAuthJSON(
          deletePushRule({
            pathParams: { scope: 'global', kind: 'content', ruleId: pushRule.rule_id },
          })
        ),
      [ct, pushRule]
    )
  );

  const removing = removeState.status === AsyncStatus.Loading;
  return (
    <IconButton onClick={remove} size="300" radii="Pill" variant="Secondary" disabled={removing}>
      {removing ? <Spinner size="100" /> : <Icon src={Icons.Cross} size="100" />}
    </IconButton>
  );
}

function KeywordModeSwitcher({ pushRule }: PushRulesProps) {
  const ct = useClient();

  const getModeActions = useNotificationModeActions(NOTIFY_MODE_OPS);

  const handleChange = useCallback(
    async (mode: NotificationMode) => {
      const actions = getModeActions(mode);
      const resp = await ct.requestAuthJSON(
        putPushRuleActions({
          pathParams: { scope: 'global', kind: 'content', ruleId: pushRule.rule_id },
          body: {
            actions,
          },
        })
      );

      const [err] = await parseMatrixResp(resp);
      if (err) throw new Error(err.data.error ?? err.data.errcode);
    },
    [ct, getModeActions, pushRule]
  );

  return <NotificationModeSwitcher pushRule={pushRule} onChange={handleChange} />;
}

export function KeywordMessagesNotifications() {
  const pushRuleEventResult = useAccountData(AccountDataType.PushRules);
  const pushRules: PushRules | undefined = useMemo(() => {
    if (pushRuleEventResult.pending) return undefined;
    const content = pushRuleEventResult.value?.content as PushRules;
    return content ?? { global: {} };
  }, [pushRuleEventResult]);

  const keywordPushRules = useMemo(() => {
    const content = pushRules?.global.content ?? [];
    return content.filter(
      (pushRule) => pushRule.default === false && typeof pushRule.pattern === 'string'
    );
  }, [pushRules]);

  return (
    <Box direction="Column" gap="100">
      <Box alignItems="Center" justifyContent="SpaceBetween" gap="200">
        <Text size="L400">Keyword Messages</Text>
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
          title="Select Keyword"
          description="Set a notification preference for message containing given keyword."
        >
          <KeywordInput />
        </SettingTile>
      </SequenceCard>
      {keywordPushRules.map((pushRule) => (
        <SequenceCard
          key={pushRule.rule_id}
          className={SequenceCardStyle}
          variant="SurfaceVariant"
          direction="Column"
          gap="400"
        >
          <SettingTile
            title={`"${pushRule.pattern}"`}
            before={<KeywordCross pushRule={pushRule} />}
            after={<KeywordModeSwitcher pushRule={pushRule} />}
          />
        </SequenceCard>
      ))}
    </Box>
  );
}
