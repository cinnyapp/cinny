import React, {
  FunctionComponent,
  useRef,
  useState,
} from "react";
import PropTypes from "prop-types";
import "./Auth.scss";
import ReCAPTCHA from "react-google-recaptcha";

import { Link } from "react-router-dom";
import * as auth from "../../../client/action/auth";

import { Text } from "../../atoms/text/Text";
import Button from "../../atoms/button/Button";
import Input from "../../atoms/input/Input";
import Spinner from "../../atoms/spinner/Spinner";

import CinnySvg from "../../../../public/res/svg/cinny.svg";
import { isLoginUserIdValid } from "../../../util/matrix/auth";

type inputEvent =
  | React.FormEvent<HTMLTextAreaElement>
  | React.ChangeEvent<HTMLInputElement>;
type inputEventHandler =
  | React.FormEventHandler<HTMLTextAreaElement>
  | React.ChangeEventHandler<HTMLInputElement>;

// This regex validates historical usernames, which don't satisy today's username requirements.
// See https://matrix.org/docs/spec/appendices#id13 for more info.
const LOCALPART_LOGIN_REGEX = /^[!-9|;-~]+$/;
const LOCALPART_SIGNUP_REGEX = /^[a-z0-9_\-.=/]+$/;
const BAD_LOCALPART_ERROR =
  "Username must contain only a-z, 0-9, ., _, =, -, and /.";
const USER_ID_TOO_LONG_ERROR =
  "Your user ID, including the hostname, can't be more than 255 characters long.";

const PASSWORD_REGEX = /.+/;
const PASSWORD_STRENGHT_REGEX =
  /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,127}$/;
const BAD_PASSWORD_ERROR =
  "Password must contain at least 1 number, 1 uppercase letter, 1 lowercase letter, 1 non-alphanumeric character. Passwords can range from 8-127 characters with no whitespaces.";
const CONFIRM_PASSWORD_ERROR = "Password don't match.";

const EMAIL_REGEX =
  /([a-z0-9]+[_a-z0-9.-][a-z0-9]+)@([a-z0-9-]+(?:.[a-z0-9-]+).[a-z]{2,4})/;
const BAD_EMAIL_ERROR = "Invalid email address";

const isValidInput = (value: string, regex: RegExp) => {
  return regex.test(value);
};

const highlightErrorField = ($input: HTMLElement) => {
  $input.focus();
  const myInput = $input;
  myInput.style.border = "1px solid var(--bg-danger)";
  myInput.style.boxShadow = "none";
};

const validateOnChange = (
  e: inputEvent,
  regex: RegExp,
  error: string,
  setErrMsg: (string) => void
) => {
  const field = e.target as HTMLInputElement;
  const fieldValue = field.value.toString();
  if (fieldValue && !isValidInput(fieldValue, regex)) {
    setErrMsg(error);
    highlightErrorField(field);
    return;
  }
  setErrMsg(undefined);
  field.style.removeProperty("border");
  field.style.removeProperty("box-shadow");
};

/**
 * Normalizes a username into a standard format.
 *
 * Removes leading and trailing whitespaces and leading "@" symbols.
 * @param rawUsername A raw-input username, which may include invalid characters.
 * @returns
 */
const normalizeUsername = (rawUsername: string): string => {
  const noLeadingAt =
    rawUsername.indexOf("@") === 0 ? rawUsername.substr(1) : rawUsername;
  return noLeadingAt.trim();
};

type AuthStep = {
  type: "start" | "recaptcha" | "terms" | "email" | "complete" | "loading";
  message?: string;
  sitekey?: string;
  en?: Record<"url", string>;
};

type AuthProps = {
  type: string;
};
export const Auth: FunctionComponent<AuthProps> = ({ type }) => {
  const [authStep, setAuthStep] = useState<AuthStep>(null);
  const usernameRef = useRef(null);
  const homeserverRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);

  const [authError, setAuthError] = useState(undefined);

  function register(recaptchaValue?, terms?, verified?) {
    auth
      .register(
        usernameRef.current.value,
        homeserverRef.current.value,
        passwordRef.current.value,
        emailRef.current.value,
        recaptchaValue,
        terms,
        verified
      )
      .then((res) => {
        setAuthError(true);
        if (res.type === "recaptcha") {
          setAuthStep({ type: res.type, sitekey: res.public_key });
          return;
        }
        if (res.type === "terms") {
          setAuthStep({ type: res.type, en: res.en });
        }
        if (res.type === "email") {
          setAuthStep({ type: res.type });
        }
        if (res.type === "done") {
          window.location.replace("/");
        }
      })
      .catch((error) => {
        setAuthStep(null);
        setAuthError(`${error}`);
      });
    if (terms) {
      setAuthStep({
        type: "loading",
        message: "Sending email verification link...",
      });
    } else
      setAuthStep({
        type: "loading",
        message: "Registration in progress...",
      });
  }

  function handleLogin(e) {
    e.preventDefault();
    setAuthError(undefined);

    const raw_username: string = usernameRef.current.value;
    const raw_homeserver: string = homeserverRef.current.value;
    const raw_password: string = passwordRef.current.value;

    const normalizedUsername = normalizeUsername(raw_username);

    const usernameValidation = isLoginUserIdValid(
      normalizedUsername,
      raw_homeserver
    );
    if (usernameValidation.isErr()) {
      setAuthError(usernameValidation.get());
      highlightErrorField(usernameRef.current);
      return;
    }

    auth
      .login(normalizeUsername, raw_homeserver, raw_password)
      .then(() => {
        setAuthError(false);
        window.location.replace("/");
      })
      .catch((error) => {
        setAuthStep(null);
        setAuthError(`${error}`);
      });
    setAuthStep({ type: "loading", message: "Login in progress..." });
  }

  function handleRegister(e) {
    e.preventDefault();
    setAuthError(undefined);

    if (!isValidInput(usernameRef.current.value, LOCALPART_SIGNUP_REGEX)) {
      setAuthError(BAD_LOCALPART_ERROR);
      highlightErrorField(usernameRef.current);
      return;
    }
    if (!isValidInput(passwordRef.current.value, PASSWORD_STRENGHT_REGEX)) {
      setAuthError(BAD_PASSWORD_ERROR);
      highlightErrorField(passwordRef.current);
      return;
    }
    if (passwordRef.current.value !== confirmPasswordRef.current.value) {
      setAuthError(CONFIRM_PASSWORD_ERROR);
      highlightErrorField(confirmPasswordRef.current);
      return;
    }
    if (!isValidInput(emailRef.current.value, EMAIL_REGEX)) {
      setAuthError(BAD_EMAIL_ERROR);
      highlightErrorField(emailRef.current);
      return;
    }
    if (
      `@${usernameRef.current.value}:${homeserverRef.current.value}`.length >
      255
    ) {
      setAuthError(USER_ID_TOO_LONG_ERROR);
      highlightErrorField(usernameRef.current);
    }
    register();
  }

  const handleAuth = type === "login" ? handleLogin : handleRegister;
  return (
    <>
      {authStep?.type === "loading" && (
        <LoadingScreen message={authStep.message} />
      )}
      {authStep?.type === "recaptcha" && (
        <Recaptcha
          message="Please check the box below to proceed."
          sitekey={authStep.sitekey}
          onChange={(v) => {
            if (typeof v === "string") register(v);
          }}
        />
      )}
      {authStep?.type === "terms" && (
        <Terms url={authStep.en.url} onSubmit={register} />
      )}
      {authStep?.type === "email" && (
        <ProcessWrapper>
          <div style={{ margin: "var(--sp-normal)", maxWidth: "450px" }}>
            <Text variant="h2">Verify email</Text>
            <div style={{ margin: "var(--sp-normal) 0" }}>
              <Text variant="b1">
                Please check your email <b>{`(${emailRef.current.value})`}</b>{" "}
                and validate before continuing further.
              </Text>
            </div>
            <Button
              variant="primary"
              onClick={() => register(undefined, undefined, true)}
            >
              Continue
            </Button>
          </div>
        </ProcessWrapper>
      )}
      <StaticWrapper>
        <div className="auth-form__wrapper flex-v--center">
          <form onSubmit={handleAuth} className="auth-form">
            <Text variant="h2">{type === "login" ? "Login" : "Register"}</Text>
            <div className="username__wrapper">
              <Input
                forwardRef={usernameRef}
                onChange={(e) =>
                  type === "login"
                    ? validateOnChange(
                        e,
                        LOCALPART_LOGIN_REGEX,
                        BAD_LOCALPART_ERROR,
                        setAuthError
                      )
                    : validateOnChange(
                        e,
                        LOCALPART_SIGNUP_REGEX,
                        BAD_LOCALPART_ERROR,
                        setAuthError
                      )
                }
                id="auth_username"
                label="Username"
                required
              />
              <Input
                forwardRef={homeserverRef}
                id="auth_homeserver"
                placeholder="Homeserver"
                value="matrix.org"
                required
              />
            </div>
            <Input
              forwardRef={passwordRef}
              onChange={(e: inputEvent) =>
                validateOnChange(
                  e,
                  type === "login" ? PASSWORD_REGEX : PASSWORD_STRENGHT_REGEX,
                  BAD_PASSWORD_ERROR,
                  setAuthError
                )
              }
              id="auth_password"
              type="password"
              label="Password"
              required
            />
            {type === "register" && (
              <>
                <Input
                  forwardRef={confirmPasswordRef}
                  onChange={(e) =>
                    validateOnChange(
                      e,
                      new RegExp(`^(${passwordRef.current.value})$`),
                      CONFIRM_PASSWORD_ERROR,
                      setAuthError
                    )
                  }
                  id="auth_confirmPassword"
                  type="password"
                  label="Confirm password"
                  required
                />
                <Input
                  forwardRef={emailRef}
                  onChange={(e) =>
                    validateOnChange(
                      e,
                      EMAIL_REGEX,
                      BAD_EMAIL_ERROR,
                      setAuthError
                    )
                  }
                  id="auth_email"
                  type="email"
                  label="Email"
                  required
                />
              </>
            )}
            <div className="submit-btn__wrapper flex--end">
              <Text
                id="auth_error"
                className="error-message"
                variant="b3"
                hidden={authError === undefined}
              >
                {authError}
              </Text>
              <Button
                variant="primary"
                type="submit"
                disabled={authError !== undefined}
              >
                {type === "login" ? "Login" : "Register"}
              </Button>
            </div>
          </form>
        </div>

        <div className="flex--center">
          <Text variant="b2">
            {`${type === "login" ? "Don't have" : "Already have"} an account?`}
            <Link to={type === "login" ? "/register" : "/login"}>
              {type === "login" ? " Register" : " Login"}
            </Link>
          </Text>
        </div>
      </StaticWrapper>
    </>
  );
};

export const StaticWrapper: FunctionComponent = ({ children }) => {
  return (
    <div className="auth__wrapper flex--center">
      <div className="auth-card">
        <div className="auth-card__interactive flex-v">
          <div className="app-ident flex">
            <img
              className="app-ident__logo noselect"
              src={CinnySvg}
              alt="Cinny logo"
            />
            <div className="app-ident__text flex-v--center">
              <Text variant="h2">Cinny</Text>
              <Text variant="b2">Yet another matrix client</Text>
            </div>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
};

type LoadingScreenProps = {
  message: string;
};

export const LoadingScreen: FunctionComponent<LoadingScreenProps> = ({
  message,
}) => {
  return (
    <ProcessWrapper>
      <Spinner />
      <div style={{ marginTop: "var(--sp-normal)" }}>
        <Text variant="b1">{message}</Text>
      </div>
    </ProcessWrapper>
  );
};

type RecaptchaProps = {
  message: string;
  sitekey: string;
  onChange: (token: string | null) => void;
};
export const Recaptcha: FunctionComponent<RecaptchaProps> = ({
  message,
  sitekey,
  onChange,
}) => {
  return (
    <ProcessWrapper>
      <div style={{ marginBottom: "var(--sp-normal)" }}>
        <Text variant="s1">{message}</Text>
      </div>
      <ReCAPTCHA sitekey={sitekey} onChange={onChange} />
    </ProcessWrapper>
  );
};

type TermsProps = {
  url: string;
  onSubmit: (
    recaptchaValue: undefined,
    termsAccepted: boolean,
    verified?: unknown
  ) => void;
};
export const Terms: FunctionComponent<TermsProps> = ({ url, onSubmit }) => {
  return (
    <ProcessWrapper>
      <form onSubmit={() => onSubmit(undefined, true)}>
        <div style={{ margin: "var(--sp-normal)", maxWidth: "450px" }}>
          <Text variant="h2">Agree with terms</Text>
          <div style={{ marginBottom: "var(--sp-normal)" }} />
          <Text variant="b1">
            In order to complete registration, you need to agree to the terms and
            conditions.
          </Text>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              margin: "var(--sp-normal) 0",
            }}
          >
            <input id="termsCheckbox" type="checkbox" required />
            <Text variant="b1">
              {"I accept "}
              <a
                style={{ cursor: "pointer" }}
                href={url}
                rel="noreferrer"
                target="_blank"
              >
                Terms and Conditions
              </a>
            </Text>
          </div>
          <Button id="termsBtn" type="submit" variant="primary">
            Submit
          </Button>
        </div>
      </form>
    </ProcessWrapper>
  );
};

export const ProcessWrapper: FunctionComponent = ({ children }) => {
  return <div className="process-wrapper">{children}</div>;
};

export default Auth;
