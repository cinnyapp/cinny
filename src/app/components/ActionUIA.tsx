import React, { ReactNode } from 'react';
import { AuthResponse, AuthType, UIAFlow } from '../utils/matrix-uia';
import { useSupportedUIAFlows, useUIACompleted, useUIAFlow } from '../hooks/useUIAFlows';
import { UIAFlowOverlay } from './UIAFlowOverlay';
import { OAuthStage, PasswordStage, SSOStage } from './uia-stages';
import { useClient } from '../hooks/useClient';

export const SUPPORTED_IN_APP_UIA_STAGES = [AuthType.Password, AuthType.Sso, AuthType.OAuth];

type ActionUIAProps = {
  authData: AuthResponse;
  ongoingFlow: UIAFlow;
  action: (authDict: object) => void;
  onCancel: () => void;
};
export function ActionUIA({ authData, ongoingFlow, action, onCancel }: ActionUIAProps) {
  const ct = useClient();
  const completed = useUIACompleted(authData);
  const { getStageToComplete } = useUIAFlow(authData, ongoingFlow);

  const stageToComplete = getStageToComplete();

  if (!stageToComplete) return null;

  const ssoRedirectURL = new URL(`/auth/${AuthType.Sso}/fallback/web`, ct.session.baseUrl);

  if (stageToComplete.session) {
    ssoRedirectURL.searchParams.set('session', stageToComplete.session);
  }

  return (
    <UIAFlowOverlay
      currentStep={completed.length + 1}
      stepCount={ongoingFlow.stages.length}
      onCancel={onCancel}
    >
      {stageToComplete.type === AuthType.Password && (
        <PasswordStage
          userId={ct.session.userId}
          stageData={stageToComplete}
          onCancel={onCancel}
          submitAuthDict={action}
        />
      )}
      {stageToComplete.type === AuthType.Sso && stageToComplete.session && (
        <SSOStage
          ssoRedirectURL={ssoRedirectURL.toString()}
          stageData={stageToComplete}
          onCancel={onCancel}
          submitAuthDict={action}
        />
      )}
      {stageToComplete.type === AuthType.OAuth && (
        <OAuthStage stageData={stageToComplete} onCancel={onCancel} submitAuthDict={action} />
      )}
    </UIAFlowOverlay>
  );
}

type ActionUIAFlowsLoaderProps = {
  authData: AuthResponse;
  unsupported: () => ReactNode;
  children: (ongoingFlow: UIAFlow) => ReactNode;
};
export function ActionUIAFlowsLoader({
  authData,
  unsupported,
  children,
}: ActionUIAFlowsLoaderProps) {
  const supportedFlows = useSupportedUIAFlows(authData.flows ?? [], SUPPORTED_IN_APP_UIA_STAGES);
  const ongoingFlow = supportedFlows.length > 0 ? supportedFlows[0] : undefined;

  if (!ongoingFlow) return unsupported();

  return children(ongoingFlow);
}
