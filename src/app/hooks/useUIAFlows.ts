import { AuthType, IAuthData, UIAFlow } from 'matrix-js-sdk';
import { useCallback, useMemo } from 'react';
import {
  getSupportedUIAFlows,
  getUIACompleted,
  getUIAError,
  getUIAErrorCode,
  getUIAParams,
  getUIASession,
} from '../utils/matrix-uia';

export const SUPPORTED_FLOW_TYPES = [
  AuthType.Dummy,
  AuthType.Password,
  AuthType.Email,
  AuthType.Terms,
  AuthType.Recaptcha,
  AuthType.RegistrationToken,
] as const;

export const useSupportedUIAFlows = (uiaFlows: UIAFlow[], supportedStages: string[]): UIAFlow[] =>
  useMemo(() => getSupportedUIAFlows(uiaFlows, supportedStages), [uiaFlows, supportedStages]);

export const useUIACompleted = (authData: IAuthData): string[] =>
  useMemo(() => getUIACompleted(authData), [authData]);

export const useUIAParams = (authData: IAuthData) =>
  useMemo(() => getUIAParams(authData), [authData]);

export const useUIASession = (authData: IAuthData) =>
  useMemo(() => getUIASession(authData), [authData]);

export const useUIAErrorCode = (authData: IAuthData) =>
  useMemo(() => getUIAErrorCode(authData), [authData]);

export const useUIAError = (authData: IAuthData) =>
  useMemo(() => getUIAError(authData), [authData]);

export type StageInfo = Record<string, unknown>;
export type AuthStageData = {
  type: string;
  info?: StageInfo;
  session?: string;
  errorCode?: string;
  error?: string;
};
export type AuthStageDataGetter = () => AuthStageData | undefined;

export type UIAFlowInterface = {
  getStageToComplete: AuthStageDataGetter;
  hasStage: (stageType: string) => boolean;
  getStageInfo: (stageType: string) => StageInfo | undefined;
};
export const useUIAFlow = (authData: IAuthData, uiaFlow: UIAFlow): UIAFlowInterface => {
  const completed = useUIACompleted(authData);
  const params = useUIAParams(authData);
  const session = useUIASession(authData);
  const errorCode = useUIAErrorCode(authData);
  const error = useUIAError(authData);

  const getStageToComplete: AuthStageDataGetter = useCallback(() => {
    const { stages } = uiaFlow;
    const nextStage = stages.find((stage) => !completed.includes(stage));
    if (!nextStage) return undefined;

    const info = params[nextStage];

    return {
      type: nextStage,
      info,
      session,
      errorCode,
      error,
    };
  }, [uiaFlow, completed, params, errorCode, error, session]);

  const hasStage = useCallback(
    (stageType: string): boolean => uiaFlow.stages.includes(stageType),
    [uiaFlow]
  );

  const getStageInfo = useCallback(
    (stageType: string): StageInfo | undefined => {
      if (!hasStage(stageType)) return undefined;

      return params[stageType];
    },
    [hasStage, params]
  );

  return {
    getStageToComplete,
    hasStage,
    getStageInfo,
  };
};
