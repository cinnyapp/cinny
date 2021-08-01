import React, { useState, useRef } from 'react';
import PropTypes from 'prop-types';
import './Auth.scss';
import ReCAPTCHA from 'react-google-recaptcha';

import { Link } from 'react-router-dom';
import * as auth from '../../../client/action/auth';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';

import CinnySvg from '../../../../public/res/svg/cinny.svg';

// This regex validates historical usernames, which don't satisy today's username requirements.
// See https://matrix.org/docs/spec/appendices#id13 for more info.
const LOCALPART_LOGIN_REGEX = /^[!-9|;-~]+$/;
const LOCALPART_SIGNUP_REGEX = /^[a-z0-9_\-.=/]+$/;
const BAD_LOCALPART_ERROR = 'Username must contain only a-z, 0-9, ., _, =, -, and /.';
const USER_ID_TOO_LONG_ERROR = 'Your user ID, including the hostname, can\'t be more than 255 characters long.';

const PASSWORD_REGEX = /.+/;
const PASSWORD_STRENGHT_REGEX = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,127}$/;
const BAD_PASSWORD_ERROR = 'Password must contain at least 1 number, 1 uppercase letter, 1 lowercase letter, 1 non-alphanumeric character. Passwords can range from 8-127 characters with no whitespaces.';
const CONFIRM_PASSWORD_ERROR = 'Passwords don\'t match.';

const EMAIL_REGEX = /([a-z0-9]+[_a-z0-9.-][a-z0-9]+)@([a-z0-9-]+(?:.[a-z0-9-]+).[a-z]{2,4})/;
const BAD_EMAIL_ERROR = 'Invalid email address';

function isValidInput(value, regex) {
  return regex.test(value);
}
function renderErrorMessage(error) {
  const $error = document.getElementById('auth_error');
  $error.textContent = error;
  $error.style.display = 'block';
}
function showBadInputError($input, error) {
  renderErrorMessage(error);
  $input.focus();
  const myInput = $input;
  myInput.style.border = '1px solid var(--bg-danger)';
  myInput.style.boxShadow = 'none';
  document.getElementById('auth_submit-btn').disabled = true;
}

function validateOnChange(e, regex, error) {
  if (!isValidInput(e.target.value, regex) && e.target.value) {
    showBadInputError(e.target, error);
    return;
  }
  document.getElementById('auth_error').style.display = 'none';
  e.target.style.removeProperty('border');
  e.target.style.removeProperty('box-shadow');
  document.getElementById('auth_submit-btn').disabled = false;
}

/**
 * Normalizes a username into a standard format.
 *
 * Removes leading and trailing whitespaces and leading "@" symbols.
 * @param {string} rawUsername A raw-input username, which may include invalid characters.
 * @returns {string}
 */
function normalizeUsername(rawUsername) {
  const noLeadingAt = rawUsername.indexOf('@') === 0 ? rawUsername.substr(1) : rawUsername;
  return noLeadingAt.trim();
}

function Auth({ type }) {
  const [process, changeProcess] = useState(null);
  const usernameRef = useRef(null);
  const homeserverRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);
  const emailRef = useRef(null);

  function register(recaptchaValue, terms, verified) {
    auth.register(
      usernameRef.current.value,
      homeserverRef.current.value,
      passwordRef.current.value,
      emailRef.current.value,
      recaptchaValue,
      terms,
      verified,
    ).then((res) => {
      document.getElementById('auth_submit-btn').disabled = false;
      if (res.type === 'recaptcha') {
        changeProcess({ type: res.type, sitekey: res.public_key });
        return;
      }
      if (res.type === 'terms') {
        changeProcess({ type: res.type, en: res.en });
      }
      if (res.type === 'email') {
        changeProcess({ type: res.type });
      }
      if (res.type === 'done') {
        window.location.replace('/');
      }
    }).catch((error) => {
      changeProcess(null);
      renderErrorMessage(error);
      document.getElementById('auth_submit-btn').disabled = false;
    });
    if (terms) {
      changeProcess({ type: 'loading', message: 'Sending email verification link...' });
    } else changeProcess({ type: 'loading', message: 'Registration in progress...' });
  }

  function handleLogin(e) {
    e.preventDefault();
    document.getElementById('auth_submit-btn').disabled = true;
    document.getElementById('auth_error').style.display = 'none';

    /** @type {string} */
    const rawUsername = usernameRef.current.value;
    /** @type {string} */
    const normalizedUsername = normalizeUsername(rawUsername);

    if (!isValidInput(normalizedUsername, LOCALPART_LOGIN_REGEX)) {
      showBadInputError(usernameRef.current, BAD_LOCALPART_ERROR);
      return;
    }

    auth.login(normalizedUsername, homeserverRef.current.value, passwordRef.current.value)
      .then(() => {
        document.getElementById('auth_submit-btn').disabled = false;
        window.location.replace('/');
      })
      .catch((error) => {
        changeProcess(null);
        renderErrorMessage(error);
        document.getElementById('auth_submit-btn').disabled = false;
      });
    changeProcess({ type: 'loading', message: 'Login in progress...' });
  }

  function handleRegister(e) {
    e.preventDefault();
    document.getElementById('auth_submit-btn').disabled = true;
    document.getElementById('auth_error').style.display = 'none';

    if (!isValidInput(usernameRef.current.value, LOCALPART_SIGNUP_REGEX)) {
      showBadInputError(usernameRef.current, BAD_LOCALPART_ERROR);
      return;
    }
    if (!isValidInput(passwordRef.current.value, PASSWORD_STRENGHT_REGEX)) {
      showBadInputError(passwordRef.current, BAD_PASSWORD_ERROR);
      return;
    }
    if (passwordRef.current.value !== confirmPasswordRef.current.value) {
      showBadInputError(confirmPasswordRef.current, CONFIRM_PASSWORD_ERROR);
      return;
    }
    if (!isValidInput(emailRef.current.value, EMAIL_REGEX)) {
      showBadInputError(emailRef.current, BAD_EMAIL_ERROR);
      return;
    }
    if (`@${usernameRef.current.value}:${homeserverRef.current.value}`.length > 255) {
      showBadInputError(usernameRef.current, USER_ID_TOO_LONG_ERROR);
      return;
    }
    register();
  }

  const handleAuth = (type === 'login') ? handleLogin : handleRegister;
  return (
    <>
      {process?.type === 'loading' && <LoadingScreen message={process.message} />}
      {process?.type === 'recaptcha' && <Recaptcha message="Please check the box below to proceed." sitekey={process.sitekey} onChange={(v) => { if (typeof v === 'string') register(v); }} />}
      {process?.type === 'terms' && <Terms url={process.en.url} onSubmit={register} />}
      {process?.type === 'email' && (
        <ProcessWrapper>
          <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
            <Text variant="h2">Verify email</Text>
            <div style={{ margin: 'var(--sp-normal) 0' }}>
              <Text variant="b1">
                Please check your email
                {' '}
                <b>{`(${emailRef.current.value})`}</b>
                {' '}
                and validate before continuing further.
              </Text>
            </div>
            <Button variant="primary" onClick={() => register(undefined, undefined, true)}>Continue</Button>
          </div>
        </ProcessWrapper>
      )}
      <StaticWrapper>
        <div className="auth-form__wrapper flex-v--center">
          <form onSubmit={handleAuth} className="auth-form">
            <Text variant="h2">{ type === 'login' ? 'Login' : 'Register' }</Text>
            <div className="username__wrapper">
              <Input
                forwardRef={usernameRef}
                onChange={(e) => (type === 'login'
                  ? validateOnChange(e, LOCALPART_LOGIN_REGEX, BAD_LOCALPART_ERROR)
                  : validateOnChange(e, LOCALPART_SIGNUP_REGEX, BAD_LOCALPART_ERROR))}
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
              onChange={(e) => validateOnChange(e, ((type === 'login') ? PASSWORD_REGEX : PASSWORD_STRENGHT_REGEX), BAD_PASSWORD_ERROR)}
              id="auth_password"
              type="password"
              label="Password"
              required
            />
            {type === 'register' && (
              <>
                <Input
                  forwardRef={confirmPasswordRef}
                  onChange={(e) => validateOnChange(e, new RegExp(`^(${passwordRef.current.value})$`), CONFIRM_PASSWORD_ERROR)}
                  id="auth_confirmPassword"
                  type="password"
                  label="Confirm password"
                  required
                />
                <Input
                  forwardRef={emailRef}
                  onChange={(e) => validateOnChange(e, EMAIL_REGEX, BAD_EMAIL_ERROR)}
                  id="auth_email"
                  type="email"
                  label="Email"
                  required
                />
              </>
            )}
            <div className="submit-btn__wrapper flex--end">
              <Text id="auth_error" className="error-message" variant="b3">Error</Text>
              <Button
                id="auth_submit-btn"
                variant="primary"
                type="submit"
              >
                {type === 'login' ? 'Login' : 'Register' }
              </Button>
            </div>
          </form>
        </div>

        <div className="flex--center">
          <Text variant="b2">
            {`${(type === 'login' ? 'Don\'t have' : 'Already have')} an account?`}
            <Link to={type === 'login' ? '/register' : '/login'}>
              { type === 'login' ? ' Register' : ' Login' }
            </Link>
          </Text>
        </div>
      </StaticWrapper>
    </>
  );
}

Auth.propTypes = {
  type: PropTypes.string.isRequired,
};

function StaticWrapper({ children }) {
  return (
    <div className="auth__wrapper flex--center">
      <div className="auth-card">
        <div className="auth-card__interactive flex-v">
          <div className="app-ident flex">
            <img className="app-ident__logo noselect" src={CinnySvg} alt="Cinny logo" />
            <div className="app-ident__text flex-v--center">
              <Text variant="h2">Cinny</Text>
              <Text variant="b2">Yet another matrix client</Text>
            </div>
          </div>
          { children }
        </div>
      </div>
    </div>
  );
}

StaticWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

function LoadingScreen({ message }) {
  return (
    <ProcessWrapper>
      <Spinner />
      <div style={{ marginTop: 'var(--sp-normal)' }}>
        <Text variant="b1">{message}</Text>
      </div>
    </ProcessWrapper>
  );
}
LoadingScreen.propTypes = {
  message: PropTypes.string.isRequired,
};

function Recaptcha({ message, sitekey, onChange }) {
  return (
    <ProcessWrapper>
      <div style={{ marginBottom: 'var(--sp-normal)' }}>
        <Text variant="s1">{message}</Text>
      </div>
      <ReCAPTCHA sitekey={sitekey} onChange={onChange} />
    </ProcessWrapper>
  );
}
Recaptcha.propTypes = {
  message: PropTypes.string.isRequired,
  sitekey: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
};

function Terms({ url, onSubmit }) {
  return (
    <ProcessWrapper>
      <form onSubmit={() => onSubmit(undefined, true)}>
        <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
          <Text variant="h2">Agree with terms</Text>
          <div style={{ marginBottom: 'var(--sp-normal)' }} />
          <Text variant="b1">In order to complete registration, you need to agree to the terms and conditions.</Text>
          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--sp-normal) 0' }}>
            <input id="termsCheckbox" type="checkbox" required />
            <Text variant="b1">
              {'I accept '}
              <a style={{ cursor: 'pointer' }} href={url} rel="noreferrer" target="_blank">Terms and Conditions</a>
            </Text>
          </div>
          <Button id="termsBtn" type="submit" variant="primary">Submit</Button>
        </div>
      </form>
    </ProcessWrapper>
  );
}
Terms.propTypes = {
  url: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
};

function ProcessWrapper({ children }) {
  return (
    <div className="process-wrapper">
      {children}
    </div>
  );
}
ProcessWrapper.propTypes = {
  children: PropTypes.node.isRequired,
};

export default Auth;
