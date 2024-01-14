import {
  Box,
  Button,
  Checkbox,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
} from 'folds';
import React, { ChangeEventHandler, useCallback, useMemo, useState } from 'react';
import {
  AuthType,
  IAuthData,
  MatrixError,
  RegisterResponse,
  UIAFlow,
  createClient,
} from 'matrix-js-sdk';
import { PasswordInput } from '../../components/password-input/PasswordInput';
import {
  getLoginTermUrl,
  getUIAFlowForStages,
  hasStageInFlows,
  requiredStageInFlows,
} from '../../utils/matrix-uia';
import { useUIAFlow, useUIAParams } from '../../hooks/useUIAFlows';
import { useAsyncCallback } from '../../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import to from 'await-to-js';
import { parseRegisterErrResp } from '../../hooks/useAuthFlows';

export const SUPPORTED_REGISTER_STAGES = [
  AuthType.RegistrationToken,
  AuthType.Terms,
  AuthType.Recaptcha,
  AuthType.Email,
  AuthType.Dummy,
];

type RegisterUIAFlowProps = {
  flow: UIAFlow;
  authData: IAuthData;
  onAuthDataChange: (authData: IAuthData) => void;
};
function RegisterUIAFlow({ flow, authData, onAuthDataChange }: RegisterUIAFlowProps) {
  const { getStageToComplete } = useUIAFlow(authData, flow);

  const stageToComplete = getStageToComplete();

  if (!stageToComplete) {
    return <p>Completed</p>;
  }

  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        {stageToComplete.type === AuthType.RegistrationToken && (
          <Spinner variant="Secondary" size="600" />
        )}
        {stageToComplete.type === AuthType.Terms && <Spinner variant="Secondary" size="600" />}
        {stageToComplete.type === AuthType.Recaptcha && <Spinner variant="Secondary" size="600" />}
        {stageToComplete.type === AuthType.Email && <Spinner variant="Secondary" size="600" />}
        {stageToComplete.type === AuthType.Dummy && <Spinner variant="Secondary" size="600" />}
      </OverlayCenter>
    </Overlay>
  );
}

type RegisterFormInputs = {
  usernameInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  confirmPasswordInput: HTMLInputElement;
  tokenInput?: HTMLInputElement;
  emailInput?: HTMLInputElement;
  termsInput?: HTMLInputElement;
};

type PasswordRegisterFormProps = {
  authData: IAuthData;
  uiaFlows: UIAFlow[];
  defaultUsername?: string;
  defaultEmail?: string;
  defaultRegisterToken?: string;
};
export function PasswordRegisterForm({
  authData,
  uiaFlows,
  defaultUsername,
  defaultEmail,
  defaultRegisterToken,
}: PasswordRegisterFormProps) {
  const serverDiscovery = useAutoDiscoveryInfo();
  const baseUrl = serverDiscovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);
  const params = useUIAParams(authData);
  const termUrl = getLoginTermUrl(params);

  const [flowData, setFlowData] = useState<
    | {
        flow: UIAFlow;
        authData: IAuthData;
      }
    | undefined
  >();

  const [registerState, register] = useAsyncCallback(
    useCallback(async () => {
      const [err, res] = await to<RegisterResponse, MatrixError>(mx.register());
      if (err) {
        const errRes = parseRegisterErrResp(err);
      }
      // TODO: registered => Redirect maybe?
    }, [mx])
  );

  const handleAuthDataChange = (authD: IAuthData) => {
    setFlowData(
      (d) =>
        d && {
          flow: d.flow,
          authData: authD,
        }
    );
  };

  const handleSubmit: ChangeEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const {
      usernameInput,
      passwordInput,
      confirmPasswordInput,
      emailInput,
      tokenInput,
      termsInput,
    } = evt.target as HTMLFormElement & RegisterFormInputs;
    const token = tokenInput?.value.trim();
    const username = usernameInput.value.trim();
    // TODO: check username availability
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    // TODO: display password doesn't match error
    if (password !== confirmPassword) return;
    const email = emailInput?.value.trim();
    const terms = termsInput?.value === 'on';

    if (!username) {
      usernameInput.focus();
      return;
    }
    // TODO: match password here or in async callback

    const pickedStages: string[] = [];
    if (token) pickedStages.push(AuthType.RegistrationToken);
    if (email) pickedStages.push(AuthType.Email);
    if (terms) pickedStages.push(AuthType.Terms);
    if (hasStageInFlows(uiaFlows, AuthType.Recaptcha)) {
      pickedStages.push(AuthType.Recaptcha);
    }

    const targetFlow = getUIAFlowForStages(uiaFlows, pickedStages);

    // TODO: send register request
    // receive response
    // check if done
    // update auth data
    // render uiaFlow component
    // component will complete stages
    // update the authData
    // if completed it will log you in

    console.log(username, password, confirmPassword, email, token, terms);
    console.log(targetFlow);
  };

  return (
    <Box as="form" onSubmit={handleSubmit} direction="Inherit" gap="400">
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Username
        </Text>
        <Input
          variant="Background"
          defaultValue={defaultUsername}
          name="usernameInput"
          size="500"
          outlined
          required
        />
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Password
        </Text>
        <PasswordInput name="passwordInput" variant="Background" size="500" outlined required />
      </Box>
      <Box direction="Column" gap="100">
        <Text as="label" size="L400" priority="300">
          Confirm Password
        </Text>
        <PasswordInput
          name="confirmPasswordInput"
          variant="Background"
          size="500"
          outlined
          required
        />
      </Box>
      {hasStageInFlows(uiaFlows, AuthType.RegistrationToken) && (
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            {requiredStageInFlows(uiaFlows, AuthType.RegistrationToken)
              ? 'Registration Token'
              : 'Registration Token (Optional)'}
          </Text>
          <Input
            variant="Background"
            defaultValue={defaultRegisterToken}
            name="tokenInput"
            size="500"
            required={requiredStageInFlows(uiaFlows, AuthType.RegistrationToken)}
            outlined
          />
        </Box>
      )}
      {hasStageInFlows(uiaFlows, AuthType.Email) && (
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            {requiredStageInFlows(uiaFlows, AuthType.Email) ? 'Email' : 'Email (Optional)'}
          </Text>
          <Input
            variant="Background"
            defaultValue={defaultEmail}
            name="emailInput"
            type="email"
            size="500"
            required={requiredStageInFlows(uiaFlows, AuthType.Email)}
            outlined
          />
        </Box>
      )}

      {hasStageInFlows(uiaFlows, AuthType.Terms) && termUrl && (
        <Box alignItems="Center" gap="200">
          <Checkbox name="termsInput" size="300" variant="Primary" required />
          <Text size="T300">
            I accept server{' '}
            <a href={termUrl} target="_blank" rel="noreferrer">
              Terms and Conditions
            </a>
            .
          </Text>
        </Box>
      )}
      <span data-spacing-node />
      <Button variant="Primary" size="500" type="submit">
        <Text as="span" size="B500">
          Register
        </Text>
      </Button>
      {flowData && (
        <RegisterUIAFlow
          flow={flowData.flow}
          authData={flowData.authData}
          onAuthDataChange={handleAuthDataChange}
        />
      )}
    </Box>
  );
}
