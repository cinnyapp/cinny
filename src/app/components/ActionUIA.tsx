import React, { ReactNode, useState } from 'react';
import {
  config,
  Dialog,
  Header,
  Text,
  IconButton,
  Box,
  Icon,
  Icons,
  Button,
  OverlayBackdrop,
  Overlay,
  OverlayCenter,
} from 'folds';
import FocusTrap from 'focus-trap-react';
import { AuthResponse, AuthType, getUIAFlowForStages, UIAFlow } from '../utils/matrix-uia';
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

function UIAFlowPicker({
  flows,
  onCancel,
  onSelect,
}: {
  flows: UIAFlow[];
  onCancel: () => void;
  onSelect: (flow: UIAFlow) => void;
}) {
  const passwordFlow = getUIAFlowForStages(flows, [AuthType.Password]);
  const ssoFlow = getUIAFlowForStages(flows, [AuthType.Sso]);

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        <FocusTrap focusTrapOptions={{ initialFocus: false, escapeDeactivates: false }}>
          <Dialog>
            <Header
              style={{
                padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
              }}
              variant="Surface"
              size="500"
            >
              <Box grow="Yes">
                <Text size="H4">Authentication</Text>
              </Box>
              <IconButton size="300" onClick={onCancel} radii="300">
                <Icon src={Icons.Cross} />
              </IconButton>
            </Header>
            <Box
              as="form"
              style={{ padding: `0 ${config.space.S400} ${config.space.S400}` }}
              direction="Column"
              gap="400"
            >
              <Box direction="Column" gap="400">
                <Text size="T200">Choose an authentication method to perform this action.</Text>
              </Box>
              <Box direction="Column" gap="200">
                {passwordFlow && (
                  <Button variant="Primary" type="button" onClick={() => onSelect(passwordFlow)}>
                    <Text as="span" size="B400">
                      Continue with Password
                    </Text>
                  </Button>
                )}
                {ssoFlow && (
                  <Button
                    variant="Secondary"
                    fill="Soft"
                    type="button"
                    onClick={() => onSelect(ssoFlow)}
                  >
                    <Text as="span" size="B400">
                      Continue with SSO
                    </Text>
                  </Button>
                )}
              </Box>
            </Box>
          </Dialog>
        </FocusTrap>
      </OverlayCenter>
    </Overlay>
  );
}

type ActionUIAFlowsLoaderProps = {
  authData: AuthResponse;
  onCancel: () => void;
  unsupported: () => ReactNode;
  children: (ongoingFlow: UIAFlow) => ReactNode;
};
export function ActionUIAFlowsLoader({
  authData,
  onCancel,
  unsupported,
  children,
}: ActionUIAFlowsLoaderProps) {
  const supportedFlows = useSupportedUIAFlows(authData.flows ?? [], SUPPORTED_IN_APP_UIA_STAGES);
  const [ongoingFlow, setOngoingFlow] = useState(
    supportedFlows.length === 1 ? supportedFlows[0] : undefined
  );

  if (supportedFlows.length === 0) return unsupported();

  if (!ongoingFlow) {
    return <UIAFlowPicker flows={supportedFlows} onCancel={onCancel} onSelect={setOngoingFlow} />;
  }

  return children(ongoingFlow);
}
