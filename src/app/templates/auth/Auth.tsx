// eslint-disable-next-line no-use-before-define
import React, { FunctionComponent, useState } from 'react';
import './Auth.scss';
import ReCAPTCHA from 'react-google-recaptcha';

import { Link } from 'react-router-dom';
import { Formik } from 'formik';
import * as auth from '../../../client/action/auth';

import { Text } from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import { Input } from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import CinnySvg from '../../../../public/res/svg/cinny.svg';
import {
  isUserIdValidForLogin,
  isUserIdValidForSignup,
} from '../../../util/matrix/auth';

const PASSWORD_STRENGTH_REGEX = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,127}$/;
const BAD_PASSWORD_ERROR = 'Password must contain at least 1 number, 1 uppercase letter, 1 lowercase letter, 1 non-alphanumeric character. Passwords can range from 8-127 characters with no whitespaces.';
const CONFIRM_PASSWORD_ERROR = 'Passwords don\'t match.';

const EMAIL_REGEX = /([a-z0-9]+[_a-z0-9.-][a-z0-9]+)@([a-z0-9-]+(?:.[a-z0-9-]+).[a-z]{2,4})/;
const BAD_EMAIL_ERROR = 'Invalid email address';

type LoginValues = {
  localpart: string;
  homeserver: string;
  password: string;
  confirmPassword: string;
  email: string;
};

/**
 * Normalizes a localpart into a standard format.
 *
 * Removes leading and trailing whitespaces and leading "@" symbols.
 * @param rawLocalpart A raw-input localpart, which may include invalid characters.
 * @returns
 */
const normalizeUsername = (rawLocalpart: string): string => {
  const noLeadingAt = rawLocalpart.indexOf('@') === 0 ? rawLocalpart.substr(1) : rawLocalpart;
  return noLeadingAt.trim();
};

export const ProcessWrapper: FunctionComponent = ({ children }) => <div className="process-wrapper">{children}</div>;

type LoadingScreenProps = {
  message: string;
};

export const LoadingScreen: FunctionComponent<LoadingScreenProps> = ({
  message,
}: LoadingScreenProps) => (
  <ProcessWrapper>
    <Spinner />
    <div style={{ marginTop: 'var(--sp-normal)' }}>
      <Text variant="b1">{message}</Text>
    </div>
  </ProcessWrapper>
);

type RecaptchaProps = {
  message: string;
  sitekey: string;
  onChange: (token: string | null) => void;
};
export const Recaptcha: FunctionComponent<RecaptchaProps> = ({
  message,
  sitekey,
  onChange,
}: RecaptchaProps) => (
  <ProcessWrapper>
    <div style={{ marginBottom: 'var(--sp-normal)' }}>
      <Text variant="s1">{message}</Text>
    </div>
    <ReCAPTCHA sitekey={sitekey} onChange={onChange} />
  </ProcessWrapper>
);

type TermsProps = {
  url: string;
  onSubmit: (
    recaptchaValue: undefined,
    termsAccepted: boolean,
    verified?: unknown
  ) => void;
};

export const Terms: FunctionComponent<TermsProps> = ({
  url,
  onSubmit,
}: TermsProps) => (
  <ProcessWrapper>
    <form onSubmit={() => onSubmit(undefined, true)}>
      <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
        <Text variant="h2">Agree with terms</Text>
        <div style={{ marginBottom: 'var(--sp-normal)' }} />
        <Text variant="b1">
          In order to complete registration, you need to agree with terms and
          conditions.
        </Text>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            margin: 'var(--sp-normal) 0',
          }}
        >
          <input id="termsCheckbox" type="checkbox" required />
          <Text variant="b1">
            {'I accept '}
            <a
              style={{ cursor: 'pointer' }}
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

export const StaticWrapper: FunctionComponent = ({ children }) => (
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

type AuthStep = {
  type: 'start' | 'recaptcha' | 'terms' | 'email' | 'complete' | 'loading';
  message?: string;
  sitekey?: string;
  en?: Record<'url', string>;
};

type AuthProps = {
  type: string;
};
export const Auth: FunctionComponent<AuthProps> = ({ type }: AuthProps) => {
  const [authStep, setAuthStep] = useState<AuthStep>(null);
  const [submittedEmail, setSubmittedEmail] = useState(undefined);

  const [authError, setAuthError] = useState(undefined);

  const authInitialValues = {
    localpart: '',
    homeserver: 'matrix.org',
    password: '',
    confirmPassword: '',
    email: '',
  };

  function register(recaptchaValue?, terms?, verified?, values?: LoginValues) {
    if (values !== undefined) setSubmittedEmail(values.email);

    auth
      .register(
        values.localpart,
        values.homeserver,
        values.password,
        values.email,
        recaptchaValue,
        terms,
        verified,
      )
      .then((res) => {
        setAuthError(true);
        if (res.type === 'recaptcha') {
          setAuthStep({ type: res.type, sitekey: res.public_key });
          return;
        }
        if (res.type === 'terms') {
          setAuthStep({ type: res.type, en: res.en });
        }
        if (res.type === 'email') {
          setAuthStep({ type: res.type });
        }
        if (res.type === 'done') {
          window.location.replace('/');
        }
      })
      .catch((error) => {
        setAuthStep(null);
        setAuthError(`${error}`);
      });
    if (terms) {
      setAuthStep({
        type: 'loading',
        message: 'Sending email verification link...',
      });
    } else {
      setAuthStep({
        type: 'loading',
        message: 'Registration in progress...',
      });
    }
  }

  function handleLogin(values: LoginValues) {
    setAuthError(undefined);

    const rawLocalpart: string = values.localpart;
    const rawHomeserver: string = values.homeserver;
    const rawPassword: string = values.password;

    const normalizedUsername = normalizeUsername(rawLocalpart);

    auth
      .login(normalizedUsername, rawHomeserver, rawPassword)
      .then(() => {
        setAuthError(false);
        window.location.replace('/');
      })
      .catch((error) => {
        setAuthStep(null);
        setAuthError(`${error}`);
      });
    setAuthStep({ type: 'loading', message: 'Login in progress...' });
  }

  function handleRegister(values: LoginValues) {
    setAuthError(undefined);
    register(null, null, null, values);
  }

  return (
    <>
      {authStep?.type === 'loading' && (
        <LoadingScreen message={authStep.message} />
      )}
      {authStep?.type === 'recaptcha' && (
        <Recaptcha
          message="Please check the box below to proceed."
          sitekey={authStep.sitekey}
          onChange={(v) => {
            if (typeof v === 'string') register(v);
          }}
        />
      )}
      {authStep?.type === 'terms' && (
        <Terms url={authStep.en.url} onSubmit={register} />
      )}
      {authStep?.type === 'email' && (
        <ProcessWrapper>
          <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
            <Text variant="h2">Verify email</Text>
            <div style={{ margin: 'var(--sp-normal) 0' }}>
              <Text variant="b1">
                Please check your email
                {' '}
                <b>{`(${submittedEmail})`}</b>
                {' '}
                and
                validate before continuing further.
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
          <Formik
            initialValues={authInitialValues}
            validate={(values) => {
              setAuthError(undefined);
              const errors = {};
              const normalizedLocalpart = normalizeUsername(values.localpart);

              if (type === 'login') {
                // Check local part and home server for LOGIN (more relaxed than
                // sign up)
                if (normalizedLocalpart !== '' && values.homeserver !== '') {
                  const userIdValidation = isUserIdValidForLogin(
                    normalizedLocalpart,
                  );
                  if (userIdValidation.isErr()) {
                    // @ts-ignore for now! TODO
                    errors.localpart = userIdValidation.get();
                  }
                }
              } else {
                // Check local part and home server for SIGNUP
                if (normalizedLocalpart !== '' && values.homeserver !== '') {
                  const userIdValidation = isUserIdValidForSignup(
                    normalizedLocalpart,
                    values.homeserver,
                  );
                  if (userIdValidation.isErr()) {
                    // @ts-ignore for now! TODO
                    errors.localpart = userIdValidation.get();
                  }
                }
                if (
                  values.password !== ''
                  && !PASSWORD_STRENGTH_REGEX.test(values.password)
                ) {
                  // @ts-ignore for now! TODO
                  errors.password = BAD_PASSWORD_ERROR;
                }

                if (
                  values.password !== ''
                  && values.confirmPassword !== ''
                  && values.password !== values.confirmPassword
                ) {
                  // @ts-ignore for now! TODO
                  errors.confirmPassword = CONFIRM_PASSWORD_ERROR;
                }

                if (values.email !== '' && !EMAIL_REGEX.test(values.email)) {
                  // @ts-ignore for now! TODO
                  errors.email = BAD_EMAIL_ERROR;
                }
              }
              setAuthError(Object.values(errors)[0]);
              return errors;
            }}
            onSubmit={(values, { setSubmitting }) => {
              const submissionValues = values;
              submissionValues.localpart = normalizeUsername(
                submissionValues.localpart,
              );
              setSubmitting(false);
              if (type === 'login') handleLogin(values);
              else handleRegister(values);
            }}
            validateOnChange={false}
            validateOnBlur
          >
            {({
              values, errors, handleChange, handleBlur, handleSubmit,
            }) => (
              <form onSubmit={handleSubmit} className="auth-form">
                <Text variant="h2">
                  {type === 'login' ? 'Login' : 'Register'}
                </Text>
                <div className="username__wrapper">
                  <Input
                    onChange={handleChange}
                    onBlur={handleBlur}
                    id="auth_username"
                    label="Username"
                    name="localpart"
                    state={errors.localpart ? 'error' : 'normal'}
                    required
                  />
                  <Input
                    onChange={handleChange}
                    onBlur={handleBlur}
                    id="auth_homeserver"
                    placeholder="Homeserver"
                    value={values.homeserver}
                    name="homeserver"
                    state={errors.homeserver ? 'error' : 'normal'}
                    required
                  />
                </div>
                <Input
                  onChange={handleChange}
                  onBlur={handleBlur}
                  id="auth_password"
                  type="password"
                  label="Password"
                  name="password"
                  state={errors.password ? 'error' : 'normal'}
                  required
                />
                {type === 'register' && (
                  <>
                    <Input
                      onBlur={handleBlur}
                      onChange={handleChange}
                      id="auth_confirmPassword"
                      type="password"
                      label="Confirm password"
                      name="confirmPassword"
                      state={errors.confirmPassword ? 'error' : 'normal'}
                      required
                    />
                    <Input
                      onBlur={handleBlur}
                      onChange={handleChange}
                      id="auth_email"
                      type="email"
                      label="Email"
                      name="email"
                      state={errors.email ? 'error' : 'normal'}
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
                    {type === 'login' ? 'Login' : 'Register'}
                  </Button>
                </div>
              </form>
            )}
          </Formik>
        </div>

        <div className="flex--center">
          <Text variant="b2">
            {`${type === 'login' ? 'Don\'t have' : 'Already have'} an account?`}
            <Link to={type === 'login' ? '/register' : '/login'}>
              {type === 'login' ? ' Register' : ' Login'}
            </Link>
          </Text>
        </div>
      </StaticWrapper>
    </>
  );
};

export default Auth;
