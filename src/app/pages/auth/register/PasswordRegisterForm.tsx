import {
  Box,
  Button,
  Checkbox,
  Dialog,
  Input,
  Overlay,
  OverlayBackdrop,
  OverlayCenter,
  Spinner,
  Text,
  color,
  config,
} from 'folds';
import React, {
  ChangeEventHandler,
  FormEventHandler,
  ReactNode,
  RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AuthDict,
  AuthType,
  IAuthData,
  IRequestTokenResponse,
  MatrixClient,
  MatrixError,
  RegisterRequest,
  UIAFlow,
  createClient,
} from 'matrix-js-sdk';
import ReCAPTCHA from 'react-google-recaptcha';
import { PasswordInput } from '../../../components/password-input/PasswordInput';
import {
  getLoginTermUrl,
  getUIAFlowForStages,
  hasStageInFlows,
  requiredStageInFlows,
} from '../../../utils/matrix-uia';
import { AuthStageData, useUIAFlow, useUIAParams } from '../../../hooks/useUIAFlows';
import { AsyncStatus, useAsyncCallback } from '../../../hooks/useAsyncCallback';
import { useAutoDiscoveryInfo } from '../../../hooks/useAutoDiscoveryInfo';
import { RegisterError, RegisterResult, register, useRegisterComplete } from './registerUtil';
import { FieldError } from '../FiledError';
import { useDebounce } from '../../../hooks/useDebounce';

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
  clientSecret: string;
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

type ConfirmPasswordMatchProps = {
  initialValue: boolean;
  children: (
    match: boolean,
    doMatch: () => void,
    passRef: RefObject<HTMLInputElement>,
    confPassRef: RefObject<HTMLInputElement>
  ) => ReactNode;
};
function ConfirmPasswordMatch({ initialValue, children }: ConfirmPasswordMatchProps) {
  const [match, setMatch] = useState(initialValue);
  const passRef = useRef<HTMLInputElement>(null);
  const confPassRef = useRef<HTMLInputElement>(null);

  const doMatch = useDebounce(
    useCallback(() => {
      const pass = passRef.current?.value;
      const confPass = confPassRef.current?.value;
      if (!confPass) {
        setMatch(initialValue);
        return;
      }
      setMatch(pass === confPass);
    }, [initialValue]),
    {
      wait: 500,
      immediate: false,
    }
  );

  return children(match, doMatch, passRef, confPassRef);
}

type StageComponentProps = {
  stageData: AuthStageData;
  submitAuthDict: (authDict: AuthDict) => void;
};

function TermsStage({ stageData, submitAuthDict }: StageComponentProps) {
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(
    () =>
      submitAuthDict({
        type: AuthType.Terms,
        session,
      }),
    [session, submitAuthDict]
  );

  useEffect(() => {
    if (session && !errorCode) {
      handleSubmit();
    }
  }, [session, errorCode, handleSubmit]);

  if (errorCode) {
    return (
      <Dialog>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Box direction="Column" gap="100">
            <Text size="H4">{errorCode}</Text>
            <Text>{error ?? 'Failed to submit Terms and Condition Acceptance.'}</Text>
          </Box>
          <Button variant="Critical" onClick={handleSubmit}>
            <Text as="span" size="B400">
              Retry
            </Text>
          </Button>
          <Button variant="Critical" fill="None" outlined onClick={() => window.location.reload()}>
            <Text as="span" size="B400">
              Cancel
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  return <Spinner variant="Secondary" size="600" />;
}

function ReCaptchaStage({ stageData, submitAuthDict }: StageComponentProps) {
  const { info, session } = stageData;

  const publicKey = info?.public_key;

  const handleChange = (token: string | null) => {
    if (!token) {
      return;
    }
    submitAuthDict({
      type: AuthType.Recaptcha,
      response: token,
      session,
    });
  };

  if (typeof publicKey !== 'string' || !session) {
    return (
      <Dialog>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Box direction="Column" gap="100">
            <Text size="H4">Invalid Data</Text>
            <Text>No valid data found to proceed with ReCAPTCHA.</Text>
          </Box>
          <Button variant="Critical" fill="None" outlined onClick={() => window.location.reload()}>
            <Text as="span" size="B400">
              Cancel
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  return <ReCAPTCHA sitekey={publicKey} onChange={handleChange} />;
}

function EmailStage({
  mx,
  email,
  clientSecret,
  stageData,
  submitAuthDict,
}: StageComponentProps & {
  email?: string;
  clientSecret: string;
  mx: MatrixClient;
}) {
  const { errorCode, error, session } = stageData;

  const sendAttemptRef = useRef(1);

  const [verifyState, verify] = useAsyncCallback<
    {
      email: string;
      result: IRequestTokenResponse;
    },
    MatrixError,
    [userEmail: string]
  >(
    useCallback(
      async (userEmail) => {
        const sendAttempt = sendAttemptRef.current;
        sendAttemptRef.current += 1;
        const result = await mx.requestRegisterEmailToken(userEmail, clientSecret, sendAttempt);
        return {
          email: userEmail,
          result,
        };
      },
      [clientSecret, mx]
    )
  );

  const handleSubmit = useCallback(
    (sessionId: string) => {
      const threepIDCreds = {
        sid: sessionId,
        client_secret: clientSecret,
      };
      submitAuthDict({
        type: AuthType.Email,
        threepid_creds: threepIDCreds,
        threepidCreds: threepIDCreds,
        session,
      });
    },
    [submitAuthDict, session, clientSecret]
  );

  useEffect(() => {
    if (email && !errorCode) verify(email);
  }, [email, errorCode, verify]);

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { retryEmailInput } = evt.target as HTMLFormElement & {
      retryEmailInput: HTMLInputElement;
    };
    const e = retryEmailInput.value;
    verify(e);
  };

  if (verifyState.status === AsyncStatus.Loading) {
    return (
      <Box direction="Column" alignItems="Center" gap="400">
        <Spinner variant="Secondary" size="600" />
        <Text style={{ color: color.Secondary.Main }}>Sending verification email...</Text>
      </Box>
    );
  }

  if (errorCode || !email || verifyState.status === AsyncStatus.Error) {
    const veifyErr = verifyState.status === AsyncStatus.Error ? verifyState.error : undefined;
    return (
      <Dialog>
        <Box
          as="form"
          onSubmit={handleFormSubmit}
          style={{ padding: config.space.S400 }}
          direction="Column"
          gap="400"
        >
          <Box direction="Column" gap="100">
            {veifyErr ? (
              <>
                <Text size="H4">{veifyErr.errcode ?? 'Verify Email'}</Text>
                <Text>
                  {veifyErr?.data?.error ??
                    veifyErr.message ??
                    'Failed to send Email verification request.'}
                </Text>
              </>
            ) : (
              <>
                <Text size="H4">{errorCode ?? 'Provide Email'}</Text>
                <Text>
                  {error ?? 'Please Enter you email address to send verification request.'}
                </Text>
              </>
            )}
            <Text as="label" size="L400" style={{ paddingTop: config.space.S400 }}>
              Email
            </Text>
            <Input
              name="retryEmailInput"
              variant="Background"
              size="500"
              outlined
              defaultValue={email}
              required
            />
          </Box>
          <Button variant="Primary" type="submit">
            <Text as="span" size="B400">
              Verify
            </Text>
          </Button>
          <Button
            variant="Critical"
            fill="None"
            outlined
            type="button"
            onClick={() => window.location.reload()}
          >
            <Text as="span" size="B400">
              Cancel
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  if (verifyState.status === AsyncStatus.Success) {
    return (
      <Dialog>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Box direction="Column" gap="100">
            <Text size="H4">Verification Request Sent</Text>
            <Text>{`Please check your email "${verifyState.data.email}" and validate before continuing further.`}</Text>
          </Box>
          <Button variant="Primary" onClick={() => handleSubmit(verifyState.data.result.sid)}>
            <Text as="span" size="B400">
              Continue
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  return <Spinner variant="Secondary" size="600" />;
}

function RegistrationTokenStage({
  token,
  stageData,
  submitAuthDict,
}: StageComponentProps & {
  token?: string;
}) {
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(
    (t: string) => {
      submitAuthDict({
        type: AuthType.RegistrationToken,
        token: t,
        session,
      });
    },
    [session, submitAuthDict]
  );

  const handleFormSubmit: FormEventHandler<HTMLFormElement> = (evt) => {
    evt.preventDefault();
    const { retryTokenInput } = evt.target as HTMLFormElement & {
      retryTokenInput: HTMLInputElement;
    };
    const t = retryTokenInput.value;
    handleSubmit(t);
  };

  useEffect(() => {
    if (token && !errorCode) handleSubmit(token);
  }, [handleSubmit, token, errorCode]);

  if (errorCode || !token) {
    return (
      <Dialog>
        <Box
          as="form"
          onSubmit={handleFormSubmit}
          style={{ padding: config.space.S400 }}
          direction="Column"
          gap="400"
        >
          <Box direction="Column" gap="100">
            <Text size="H4">{errorCode ?? 'Request on Hold'}</Text>
            <Text>{error ?? 'Invalid registration token provided.'}</Text>
            <Text as="label" size="L400" style={{ paddingTop: config.space.S400 }}>
              Registration Token
            </Text>
            <Input
              name="retryTokenInput"
              variant="Background"
              size="500"
              outlined
              defaultValue={token}
              required
            />
          </Box>
          <Button variant="Critical" type="submit">
            <Text as="span" size="B400">
              Retry
            </Text>
          </Button>
          <Button
            variant="Critical"
            fill="None"
            outlined
            type="button"
            onClick={() => window.location.reload()}
          >
            <Text as="span" size="B400">
              Cancel
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  return <Spinner variant="Secondary" size="600" />;
}

function DummyStage({ stageData, submitAuthDict }: StageComponentProps) {
  const { errorCode, error, session } = stageData;

  const handleSubmit = useCallback(() => {
    submitAuthDict({
      type: AuthType.Dummy,
      session,
    });
  }, [session, submitAuthDict]);

  useEffect(() => {
    if (!errorCode) handleSubmit();
  }, [handleSubmit, errorCode]);

  if (errorCode) {
    return (
      <Dialog>
        <Box style={{ padding: config.space.S400 }} direction="Column" gap="400">
          <Box direction="Column" gap="100">
            <Text size="H4">{errorCode}</Text>
            <Text>{error ?? 'Failed to submit final authentication request.'}</Text>
          </Box>
          <Button variant="Critical" onClick={handleSubmit}>
            <Text as="span" size="B400">
              Retry
            </Text>
          </Button>
          <Button variant="Critical" fill="None" outlined onClick={() => window.location.reload()}>
            <Text as="span" size="B400">
              Cancel
            </Text>
          </Button>
        </Box>
      </Dialog>
    );
  }

  return <Spinner variant="Secondary" size="600" />;
}

type RegisterUIAFlowProps = {
  mx: MatrixClient;
  formData: FormData;
  flow: UIAFlow;
  authData: IAuthData;
  onRegister: (registerReqData: RegisterRequest) => void;
};
function RegisterUIAFlow({ mx, formData, flow, authData, onRegister }: RegisterUIAFlowProps) {
  const { getStageToComplete } = useUIAFlow(authData, flow);

  const stageToComplete = getStageToComplete();

  const handleAuthDict = useCallback(
    (authDict: AuthDict) => {
      const { password, username } = formData;
      onRegister({
        auth: authDict,
        password,
        username,
        initial_device_display_name: 'Cinny Web',
      });
    },
    [onRegister, formData]
  );

  if (!stageToComplete) return null;
  return (
    <Overlay open backdrop={<OverlayBackdrop />}>
      <OverlayCenter>
        {stageToComplete.type === AuthType.RegistrationToken && (
          <RegistrationTokenStage
            token={formData.token}
            stageData={stageToComplete}
            submitAuthDict={handleAuthDict}
          />
        )}
        {stageToComplete.type === AuthType.Terms && (
          <TermsStage stageData={stageToComplete} submitAuthDict={handleAuthDict} />
        )}
        {stageToComplete.type === AuthType.Recaptcha && (
          <ReCaptchaStage stageData={stageToComplete} submitAuthDict={handleAuthDict} />
        )}
        {stageToComplete.type === AuthType.Email && (
          <EmailStage
            mx={mx}
            email={formData.email}
            clientSecret={formData.clientSecret}
            stageData={stageToComplete}
            submitAuthDict={handleAuthDict}
          />
        )}
        {stageToComplete.type === AuthType.Dummy && (
          <DummyStage stageData={stageToComplete} submitAuthDict={handleAuthDict} />
        )}
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
    const password = passwordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    if (password !== confirmPassword) {
      return;
    }
    const email = emailInput?.value.trim();
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
      clientSecret: mx.generateClientSecret(),
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
        <ConfirmPasswordMatch initialValue>
          {(match, doMatch, passRef, confPassRef) => (
            <>
              <Box direction="Column" gap="100">
                <Text as="label" size="L400" priority="300">
                  Password
                </Text>
                <PasswordInput
                  ref={passRef}
                  onChange={doMatch}
                  name="passwordInput"
                  variant="Background"
                  size="500"
                  outlined
                  required
                />
                {registerError?.errcode === RegisterError.PasswordWeak && (
                  <FieldError message="Weak Password. Given Password is rejected by server please try choosing more strong Password." />
                )}
                {registerError?.errcode === RegisterError.PasswordShort && (
                  <FieldError message="Short Password. Given Password is rejected by server please try choosing more long Password." />
                )}
              </Box>
              <Box direction="Column" gap="100">
                <Text as="label" size="L400" priority="300">
                  Confirm Password
                </Text>
                <PasswordInput
                  ref={confPassRef}
                  onChange={doMatch}
                  name="confirmPasswordInput"
                  variant="Background"
                  size="500"
                  style={{ color: match ? undefined : color.Critical.Main }}
                  outlined
                  required
                />
              </Box>
            </>
          )}
        </ConfirmPasswordMatch>
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
        {registerError?.errcode === RegisterError.RateLimited && (
          <FieldError message="Failed to register. Your register request has been rate-limited by server, Please try after some time." />
        )}
        {registerError?.errcode === RegisterError.Forbidden && (
          <FieldError message="Failed to register. The homeserver does not permit registration." />
        )}
        {registerError?.errcode === RegisterError.InvalidRequest && (
          <FieldError message="Failed to register. Invalid request." />
        )}
        {registerError?.errcode === RegisterError.Unknown && (
          <FieldError message="Failed to register. Unknown Reason." />
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
            mx={mx}
            formData={formData}
            flow={ongoingFlow}
            authData={ongoingAuthData}
            onRegister={handleRegister}
          />
        )}
      {registerState.status === AsyncStatus.Loading && (
        <Overlay open backdrop={<OverlayBackdrop />}>
          <OverlayCenter>
            <Spinner variant="Secondary" size="600" />
          </OverlayCenter>
        </Overlay>
      )}
    </>
  );
}
