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
  RegisterRequest,
  UIAFlow,
  createClient,
} from 'matrix-js-sdk';
import { PasswordInput } from '../../../components/password-input/PasswordInput';
import {
  getLoginTermUrl,
  getUIAFlowForStages,
  hasStageInFlows,
  requiredStageInFlows,
} from '../../../utils/matrix-uia';
import { useUIAFlow, useUIAParams } from '../../../hooks/useUIAFlows';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { RegisterError, RegisterResult, register, useRegisterComplete } from './registerUtil';
import { FieldError } from '../FiledError';

export const SUPPORTED_REGISTER_STAGES = [
  AuthType.RegistrationToken,
  AuthType.Terms,
  AuthType.Recaptcha,
  AuthType.Email,
  AuthType.Dummy,
];
type RegisterFormInputs = {
  usernameInput: HTMLInputElement;
  passwordInput: HTMLInputElement;
  confirmPasswordInput: HTMLInputElement;
  tokenInput?: HTMLInputElement;
  emailInput?: HTMLInputElement;
  termsInput?: HTMLInputElement;
};

type FormData = {
  username: string;
  password: string;
  token?: string;
  email?: string;
  terms?: boolean;
};

const pickStages = (uiaFlows: UIAFlow[], formData: FormData): string[] => {
  const pickedStages: string[] = [];
  if (formData.token) pickedStages.push(AuthType.RegistrationToken);
  if (formData.email) pickedStages.push(AuthType.Email);
  if (formData.terms) pickedStages.push(AuthType.Terms);
  if (hasStageInFlows(uiaFlows, AuthType.Recaptcha)) {
    pickedStages.push(AuthType.Recaptcha);
  }

  return pickedStages;
};

type RegisterUIAFlowProps = {
  formData: FormData;
  flow: UIAFlow;
  authData: IAuthData;
  onRegister: (registerReqData: RegisterRequest) => void;
};
function RegisterUIAFlow({ formData, flow, authData, onRegister }: RegisterUIAFlowProps) {
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
  const [formData, setFormData] = useState<FormData>();

  const [ongoingFlow, setOngoingFlow] = useState<UIAFlow>();

  const [registerState, handleRegister] = useAsyncCallback<
    RegisterResult,
    MatrixError,
    [RegisterRequest]
  >(useCallback(async (registerReqData) => register(mx, registerReqData), [mx]));
  const [ongoingAuthData, customRegisterResp] =
    registerState.status === AsyncStatus.Success ? registerState.data : [];
  const registerError =
    registerState.status === AsyncStatus.Error ? registerState.error : undefined;

  useRegisterComplete(customRegisterResp);

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
    // TODO: verify email
    const terms = termsInput?.value === 'on';

    if (!username) {
      usernameInput.focus();
      return;
    }

    const fData: FormData = {
      username,
      password,
      token,
      email,
      terms,
    };
    const pickedStages = pickStages(uiaFlows, fData);
    const pickedFlow = getUIAFlowForStages(uiaFlows, pickedStages);
    setOngoingFlow(pickedFlow);
    setFormData(fData);
    handleRegister({
      username,
      password,
      auth: {
        session: authData.session,
      },
      initial_device_display_name: 'Cinny Web',
    });
  };

  return (
    <>
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
          {registerError?.errcode === RegisterError.UserTaken && (
            <FieldError message="This username is already taken." />
          )}
          {registerError?.errcode === RegisterError.UserInvalid && (
            <FieldError message="This username contains invalid characters." />
          )}
          {registerError?.errcode === RegisterError.UserExclusive && (
            <FieldError message="This username is reserved." />
          )}
        </Box>
        <Box direction="Column" gap="100">
          <Text as="label" size="L400" priority="300">
            Password
          </Text>
          <PasswordInput name="passwordInput" variant="Background" size="500" outlined required />
          {registerError?.errcode === RegisterError.PasswordWeak && (
            <FieldError message="Weak Password. Given Password is rejected by server please try choosing more strong Password." />
          )}
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
      </Box>
      {registerState.status === AsyncStatus.Success &&
        formData &&
        ongoingFlow &&
        ongoingAuthData && (
          <RegisterUIAFlow
            formData={formData}
            flow={ongoingFlow}
            authData={ongoingAuthData}
            onRegister={handleRegister}
          />
        )}
      {registerState.status === AsyncStatus.Loading && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter />
        </Overlay>
      )}
    </>
  );
}
