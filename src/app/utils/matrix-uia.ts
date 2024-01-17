import { AuthType, IAuthData, UIAFlow } from 'matrix-js-sdk';

export const getSupportedUIAFlows = (uiaFlows: UIAFlow[], supportedStages: string[]): UIAFlow[] => {
  const supportedUIAFlows = uiaFlows.filter((flow) =>
    flow.stages.every((stage) => supportedStages.includes(stage))
  );

  return supportedUIAFlows;
};

export const getUIACompleted = (authData: IAuthData): string[] => {
  const completed = authData.completed ?? [];
  return completed;
};

export type UIAParams = Record<string, Record<string, unknown>>;
export const getUIAParams = (authData: IAuthData): UIAParams => {
  const params = authData.params ?? {};
  return params;
};

export const getUIASession = (authData: IAuthData): string | undefined => {
  const session = authData.session ?? undefined;
  return session;
};

export const getUIAErrorCode = (authData: IAuthData): string | undefined => {
  const errorCode =
    'errcode' in authData && typeof authData.errcode === 'string' ? authData.errcode : undefined;

  return errorCode;
};

export const getUIAError = (authData: IAuthData): string | undefined => {
  const errorCode =
    'error' in authData && typeof authData.error === 'string' ? authData.error : undefined;

  return errorCode;
};

export const getUIAFlowForStages = (uiaFlows: UIAFlow[], stages: string[]): UIAFlow | undefined => {
  const matchedFlows = uiaFlows
    .filter((flow) => {
      if (flow.stages.length < stages.length) return false;
      if (flow.stages.length > stages.length) {
        // As a valid flow can also have m.login.dummy type,
        // we will pick one extra length flow only if it has dummy
        if (flow.stages.length > stages.length + 1) return false;
        if (stages.includes(AuthType.Dummy)) return false;
        if (flow.stages.includes(AuthType.Dummy)) return true;
        return false;
      }
      return true;
    })
    .filter((flow) => stages.every((stage) => flow.stages.includes(stage)));

  if (matchedFlows.length === 0) return undefined;

  matchedFlows.sort((a, b) => a.stages.length - b.stages.length);
  return matchedFlows[0];
};

export const hasStageInFlows = (uiaFlows: UIAFlow[], stage: string) =>
  uiaFlows.some((flow) => flow.stages.includes(stage));

export const requiredStageInFlows = (uiaFlows: UIAFlow[], stage: string) =>
  uiaFlows.every((flow) => flow.stages.includes(stage));

export const getLoginTermUrl = (params: UIAParams): string | undefined => {
  const terms = params[AuthType.Terms];
  if (terms && 'policies' in terms && typeof terms.policies === 'object') {
    if (terms.policies === null) return undefined;
    if ('privacy_policy' in terms.policies && typeof terms.policies.privacy_policy === 'object') {
      if (terms.policies.privacy_policy === null) return undefined;
      const langToPolicy = terms.policies.privacy_policy as Record<string, any>;
      const url = langToPolicy.en?.url;
      if (typeof url === 'string') return url;

      const firstKey = Object.keys(langToPolicy)[0];
      return langToPolicy[firstKey]?.url;
    }
  }
  return undefined;
};
