import {
  PushRule,
  PushRuleAction,
  PushRuleCondition,
  PushRuleKind,
  PushRules,
} from 'neurone/lib/api/types';
import { useMemo } from 'react';
import { PushRuleId } from '../../types/matrix/accountData';

export type PushRuleData = {
  kind: PushRuleKind;
  pushRule: PushRule;
};

export const makePushRuleData = (
  kind: PushRuleKind,
  ruleId: PushRuleId,
  actions: PushRuleAction[],
  conditions?: PushRuleCondition[],
  pattern?: string,
  enabled?: boolean,
  _default?: boolean
): PushRuleData => ({
  kind,
  pushRule: {
    rule_id: ruleId,
    default: _default ?? true,
    enabled: enabled ?? true,
    pattern,
    conditions,
    actions,
  },
});

export const orderedPushRuleKinds: PushRuleKind[] = [
  'override',
  'content',
  'room',
  'sender',
  'underride',
];

export const getPushRule = (
  pushRules: PushRules,
  ruleId: PushRuleId | string
): PushRuleData | undefined => {
  const { global } = pushRules;

  let ruleData: PushRuleData | undefined;

  orderedPushRuleKinds.some((kind) => {
    const rules = global[kind];
    const pushRule = rules?.find((r) => r.rule_id === ruleId);
    if (pushRule) {
      ruleData = {
        kind,
        pushRule,
      };
      return true;
    }
    return false;
  });

  return ruleData;
};

export const usePushRule = (
  pushRules: PushRules,
  ruleId: PushRuleId | string
): PushRuleData | undefined => useMemo(() => getPushRule(pushRules, ruleId), [pushRules, ruleId]);
