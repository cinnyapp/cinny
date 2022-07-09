/* eslint-disable react/prop-types */
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import './Auth.scss';
import ReCAPTCHA from 'react-google-recaptcha';
import { Formik } from 'formik';

import * as auth from '../../../client/action/auth';
import cons from '../../../client/state/cons';
import { Debounce, getUrlPrams } from '../../../util/common';
import { getBaseUrl } from '../../../util/matrixUtil';

import Text from '../../atoms/text/Text';
import Button from '../../atoms/button/Button';
import IconButton from '../../atoms/button/IconButton';
import Input from '../../atoms/input/Input';
import Spinner from '../../atoms/spinner/Spinner';
import ScrollView from '../../atoms/scroll/ScrollView';
import Header, { TitleWrapper } from '../../atoms/header/Header';
import Avatar from '../../atoms/avatar/Avatar';
import ContextMenu, { MenuItem, MenuHeader } from '../../atoms/context-menu/ContextMenu';

import ChevronBottomIC from '../../../../public/res/ic/outlined/chevron-bottom.svg';
import EyeIC from '../../../../public/res/ic/outlined/eye.svg';
import EyeBlindIC from '../../../../public/res/ic/outlined/eye-blind.svg';
import CinnySvg from '../../../../public/res/svg/cinny.svg';
import SSOButtons from '../../molecules/sso-buttons/SSOButtons';

const LOCALPART_SIGNUP_REGEX = /^[a-z0-9_\-.=/]+$/;
const BAD_LOCALPART_ERROR = 'Username can only contain characters a-z, 0-9, or \'=_-./\'';
const USER_ID_TOO_LONG_ERROR = 'Your user ID, including the hostname, can\'t be more than 255 characters long.';

const PASSWORD_STRENGHT_REGEX = /^(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[^\w\d\s:])([^\s]){8,127}$/;
const BAD_PASSWORD_ERROR = 'Password must contain at least 1 lowercase, 1 uppercase, 1 number, 1 non-alphanumeric character, 8-127 characters with no space.';
const CONFIRM_PASSWORD_ERROR = 'Passwords don\'t match.';

const EMAIL_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const BAD_EMAIL_ERROR = 'Invalid email address';

function isValidInput(value, regex) {
  if (typeof regex === 'string') return regex === value;
  return regex.test(value);
}
function normalizeUsername(rawUsername) {
  const noLeadingAt = rawUsername.indexOf('@') === 0 ? rawUsername.substr(1) : rawUsername;
  return noLeadingAt.trim();
}

let searchingHs = null;
function Homeserver({ onChange }) {
  const [hs, setHs] = useState(null);
  const [debounce] = useState(new Debounce());
  const [process, setProcess] = useState({ isLoading: true, message: 'Loading homeserver list...' });
  const hsRef = useRef();

  const setupHsConfig = async (servername) => {
    setProcess({ isLoading: true, message: 'Looking for homeserver...' });
    let baseUrl = null;
    baseUrl = await getBaseUrl(servername);

    if (searchingHs !== servername) return;
    setProcess({ isLoading: true, message: `Connecting to ${baseUrl}...` });
    const tempClient = auth.createTemporaryClient(baseUrl);

    Promise.allSettled([tempClient.loginFlows(), tempClient.register()])
      .then((values) => {
        const loginFlow = values[0].status === 'fulfilled' ? values[0]?.value : undefined;
        const registerFlow = values[1].status === 'rejected' ? values[1]?.reason?.data : undefined;
        if (loginFlow === undefined || registerFlow === undefined) throw new Error();

        if (searchingHs !== servername) return;
        onChange({ baseUrl, login: loginFlow, register: registerFlow });
        setProcess({ isLoading: false });
      }).catch(() => {
        if (searchingHs !== servername) return;
        onChange(null);
        setProcess({ isLoading: false, error: 'Unable to connect. Please check your input.' });
      });
  };

  useEffect(() => {
    onChange(null);
    if (hs === null || hs?.selected.trim() === '') return;
    searchingHs = hs.selected;
    setupHsConfig(hs.selected);
  }, [hs]);

  useEffect(async () => {
    const link = window.location.href;
    const configFileUrl = `${link}${link[link.length - 1] === '/' ? '' : '/'}config.json`;
    try {
      const result = await (await fetch(configFileUrl, { method: 'GET' })).json();
      const selectedHs = result?.defaultHomeserver;
      const hsList = result?.homeserverList;
      const allowCustom = result?.allowCustomHomeservers ?? true;
      if (!hsList?.length > 0 || selectedHs < 0 || selectedHs >= hsList?.length) {
        throw new Error();
      }
      setHs({ selected: hsList[selectedHs], list: hsList, allowCustom });
    } catch {
      setHs({ selected: 'matrix.org', list: ['matrix.org'], allowCustom: true });
    }
  }, []);

  const handleHsInput = (e) => {
    const { value } = e.target;
    setProcess({ isLoading: false });
    debounce._(async () => {
      setHs({ ...hs, selected: value.trim() });
    }, 700)();
  };

  return (
    <>
      <div className="homeserver-form">
        <Input
          name="homeserver"
          onChange={handleHsInput}
          value={hs?.selected}
          forwardRef={hsRef}
          label="Homeserver"
          disabled={hs === null || !hs.allowCustom}
        />
        <ContextMenu
          placement="right"
          content={(hideMenu) => (
            <>
              <MenuHeader>Homeserver list</MenuHeader>
              {
                hs?.list.map((hsName) => (
                  <MenuItem
                    key={hsName}
                    onClick={() => {
                      hideMenu();
                      hsRef.current.value = hsName;
                      setHs({ ...hs, selected: hsName });
                    }}
                  >
                    {hsName}
                  </MenuItem>
                ))
              }
            </>
          )}
          render={(toggleMenu) => <IconButton onClick={toggleMenu} src={ChevronBottomIC} />}
        />
      </div>
      {process.error !== undefined && <Text className="homeserver-form__error" variant="b3">{process.error}</Text>}
      {process.isLoading && (
        <div className="homeserver-form__status flex--center">
          <Spinner size="small" />
          <Text variant="b2">{process.message}</Text>
        </div>
      )}
    </>
  );
}
Homeserver.propTypes = {
  onChange: PropTypes.func.isRequired,
};

function Login({ loginFlow, baseUrl }) {
  const [typeIndex, setTypeIndex] = useState(0);
  const [passVisible, setPassVisible] = useState(false);
  const loginTypes = ['Username', 'Email'];
  const isPassword = loginFlow?.filter((flow) => flow.type === 'm.login.password')[0];
  const ssoProviders = loginFlow?.filter((flow) => flow.type === 'm.login.sso')[0];

  const initialValues = {
    username: '', password: '', email: '', other: '',
  };

  const validator = (values) => {
    const errors = {};
    if (typeIndex === 1 && values.email.length > 0 && !isValidInput(values.email, EMAIL_REGEX)) {
      errors.email = BAD_EMAIL_ERROR;
    }
    return errors;
  };
  const submitter = async (values, actions) => {
    let userBaseUrl = baseUrl;
    let { username } = values;
    const mxIdMatch = username.match(/^@(.+):(.+\..+)$/);
    if (typeIndex === 0 && mxIdMatch) {
      [, username, userBaseUrl] = mxIdMatch;
      userBaseUrl = await getBaseUrl(userBaseUrl);
    }

    return auth.login(
      userBaseUrl,
      typeIndex === 0 ? normalizeUsername(username) : undefined,
      typeIndex === 1 ? values.email : undefined,
      values.password,
    ).then(() => {
      actions.setSubmitting(true);
      window.location.reload();
    }).catch((error) => {
      let msg = error.message;
      if (msg === 'Unknown message') msg = 'Please check your credentials';
      actions.setErrors({
        password: msg === 'Invalid password' ? msg : undefined,
        other: msg !== 'Invalid password' ? msg : undefined,
      });
      actions.setSubmitting(false);
    });
  };

  return (
    <>
      <div className="auth-form__heading">
        <Text variant="h2" weight="medium">Login</Text>
        {isPassword && (
          <ContextMenu
            placement="right"
            content={(hideMenu) => (
              loginTypes.map((type, index) => (
                <MenuItem
                  key={type}
                  onClick={() => {
                    hideMenu();
                    setTypeIndex(index);
                  }}
                >
                  {type}
                </MenuItem>
              ))
            )}
            render={(toggleMenu) => (
              <Button onClick={toggleMenu} iconSrc={ChevronBottomIC}>
                {loginTypes[typeIndex]}
              </Button>
            )}
          />
        )}
      </div>
      {isPassword && (
        <Formik
          initialValues={initialValues}
          onSubmit={submitter}
          validate={validator}
        >
          {({
            values, errors, handleChange, handleSubmit, isSubmitting,
          }) => (
            <>
              {isSubmitting && <LoadingScreen message="Login in progress..." />}
              <form className="auth-form" onSubmit={handleSubmit}>
                {typeIndex === 0 && <Input values={values.username} name="username" onChange={handleChange} label="Username" type="username" required />}
                {errors.username && <Text className="auth-form__error" variant="b3">{errors.username}</Text>}
                {typeIndex === 1 && <Input values={values.email} name="email" onChange={handleChange} label="Email" type="email" required />}
                {errors.email && <Text className="auth-form__error" variant="b3">{errors.email}</Text>}
                <div className="auth-form__pass-eye-wrapper">
                  <Input values={values.password} name="password" onChange={handleChange} label="Password" type={passVisible ? 'text' : 'password'} required />
                  <IconButton onClick={() => setPassVisible(!passVisible)} src={passVisible ? EyeIC : EyeBlindIC} size="extra-small" />
                </div>
                {errors.password && <Text className="auth-form__error" variant="b3">{errors.password}</Text>}
                {errors.other && <Text className="auth-form__error" variant="b3">{errors.other}</Text>}
                <div className="auth-form__btns">
                  <Button variant="primary" type="submit" disabled={isSubmitting}>Login</Button>
                </div>
              </form>
            </>
          )}
        </Formik>
      )}
      {ssoProviders && isPassword && <Text className="sso__divider">OR</Text>}
      {ssoProviders && (
        <SSOButtons
          type="sso"
          identityProviders={ssoProviders.identity_providers}
          baseUrl={baseUrl}
        />
      )}
    </>
  );
}
Login.propTypes = {
  loginFlow: PropTypes.arrayOf(
    PropTypes.shape({}),
  ).isRequired,
  baseUrl: PropTypes.string.isRequired,
};

let sid;
let clientSecret;
function Register({ registerInfo, loginFlow, baseUrl }) {
  const [process, setProcess] = useState({});
  const [passVisible, setPassVisible] = useState(false);
  const [cPassVisible, setCPassVisible] = useState(false);
  const formRef = useRef();

  const ssoProviders = loginFlow?.filter((flow) => flow.type === 'm.login.sso')[0];
  const isDisabled = registerInfo.errcode !== undefined;
  const { flows, params, session } = registerInfo;

  let isEmail = false;
  let isEmailRequired = true;
  let isRecaptcha = false;
  let isTerms = false;
  let isDummy = false;

  flows?.forEach((flow) => {
    if (isEmailRequired && flow.stages.indexOf('m.login.email.identity') === -1) isEmailRequired = false;
    if (!isEmail) isEmail = flow.stages.indexOf('m.login.email.identity') > -1;
    if (!isRecaptcha) isRecaptcha = flow.stages.indexOf('m.login.recaptcha') > -1;
    if (!isTerms) isTerms = flow.stages.indexOf('m.login.terms') > -1;
    if (!isDummy) isDummy = flow.stages.indexOf('m.login.dummy') > -1;
  });

  const initialValues = {
    username: '', password: '', confirmPassword: '', email: '', other: '',
  };

  const validator = (values) => {
    const errors = {};
    if (values.username.list > 255) errors.username = USER_ID_TOO_LONG_ERROR;
    if (values.username.length > 0 && !isValidInput(values.username, LOCALPART_SIGNUP_REGEX)) {
      errors.username = BAD_LOCALPART_ERROR;
    }
    if (values.password.length > 0 && !isValidInput(values.password, PASSWORD_STRENGHT_REGEX)) {
      errors.password = BAD_PASSWORD_ERROR;
    }
    if (values.confirmPassword.length > 0
      && !isValidInput(values.confirmPassword, values.password)) {
      errors.confirmPassword = CONFIRM_PASSWORD_ERROR;
    }
    if (values.email.length > 0 && !isValidInput(values.email, EMAIL_REGEX)) {
      errors.email = BAD_EMAIL_ERROR;
    }
    return errors;
  };
  const submitter = (values, actions) => {
    const tempClient = auth.createTemporaryClient(baseUrl);
    clientSecret = tempClient.generateClientSecret();
    return tempClient.isUsernameAvailable(values.username)
      .then(async (isAvail) => {
        if (!isAvail) {
          actions.setErrors({ username: 'Username is already taken' });
          actions.setSubmitting(false);
          return;
        }
        if (isEmail && values.email.length > 0) {
          const result = await auth.verifyEmail(baseUrl, values.email, clientSecret, 1);
          if (result.errcode) {
            if (result.errcode === 'M_THREEPID_IN_USE') actions.setErrors({ email: result.error });
            else actions.setErrors({ others: result.error || result.message });
            actions.setSubmitting(false);
            return;
          }
          sid = result.sid;
        }
        setProcess({ type: 'processing', message: 'Registration in progress....' });
        actions.setSubmitting(false);
      }).catch((err) => {
        const msg = err.message || err.error;
        if (['M_USER_IN_USE', 'M_INVALID_USERNAME', 'M_EXCLUSIVE'].indexOf(err.errcode) > -1) {
          actions.setErrors({ username: err.errcode === 'M_USER_IN_USE' ? 'Username is already taken' : msg });
        } else if (msg) actions.setErrors({ other: msg });

        actions.setSubmitting(false);
      });
  };

  const refreshWindow = () => window.location.reload();

  const getInputs = () => {
    const f = formRef.current;
    return [f.username.value, f.password.value, f?.email?.value];
  };

  useEffect(() => {
    if (process.type !== 'processing') return;
    const asyncProcess = async () => {
      const [username, password, email] = getInputs();
      const d = await auth.completeRegisterStage(baseUrl, username, password, { session });

      if (isRecaptcha && !d.completed.includes('m.login.recaptcha')) {
        const sitekey = params['m.login.recaptcha'].public_key;
        setProcess({ type: 'm.login.recaptcha', sitekey });
        return;
      }
      if (isTerms && !d.completed.includes('m.login.terms')) {
        const pp = params['m.login.terms'].policies.privacy_policy;
        const url = pp?.en.url || pp[Object.keys(pp)[0]].url;
        setProcess({ type: 'm.login.terms', url });
        return;
      }
      if (isEmail && email.length > 0) {
        setProcess({ type: 'm.login.email.identity', email });
        return;
      }
      if (isDummy) {
        const data = await auth.completeRegisterStage(baseUrl, username, password, {
          type: 'm.login.dummy',
          session,
        });
        if (data.done) refreshWindow();
      }
    };
    asyncProcess();
  }, [process]);

  const handleRecaptcha = async (value) => {
    if (typeof value !== 'string') return;
    const [username, password] = getInputs();
    const d = await auth.completeRegisterStage(baseUrl, username, password, {
      type: 'm.login.recaptcha',
      response: value,
      session,
    });
    if (d.done) refreshWindow();
    else setProcess({ type: 'processing', message: 'Registration in progress...' });
  };
  const handleTerms = async () => {
    const [username, password] = getInputs();
    const d = await auth.completeRegisterStage(baseUrl, username, password, {
      type: 'm.login.terms',
      session,
    });
    if (d.done) refreshWindow();
    else setProcess({ type: 'processing', message: 'Registration in progress...' });
  };
  const handleEmailVerify = async () => {
    const [username, password] = getInputs();
    const d = await auth.completeRegisterStage(baseUrl, username, password, {
      type: 'm.login.email.identity',
      threepidCreds: { sid, client_secret: clientSecret },
      threepid_creds: { sid, client_secret: clientSecret },
      session,
    });
    if (d.done) refreshWindow();
    else setProcess({ type: 'processing', message: 'Registration in progress...' });
  };

  return (
    <>
      {process.type === 'processing' && <LoadingScreen message={process.message} />}
      {process.type === 'm.login.recaptcha' && <Recaptcha message="Please check the box below to proceed." sitekey={process.sitekey} onChange={handleRecaptcha} />}
      {process.type === 'm.login.terms' && <Terms url={process.url} onSubmit={handleTerms} />}
      {process.type === 'm.login.email.identity' && <EmailVerify email={process.email} onContinue={handleEmailVerify} />}
      <div className="auth-form__heading">
        {!isDisabled && <Text variant="h2" weight="medium">Register</Text>}
        {isDisabled && <Text className="auth-form__error">{registerInfo.error}</Text>}
      </div>
      {!isDisabled && (
        <Formik
          initialValues={initialValues}
          onSubmit={submitter}
          validate={validator}
        >
          {({
            values, errors, handleChange, handleSubmit, isSubmitting,
          }) => (
            <>
              {process.type === undefined && isSubmitting && <LoadingScreen message="Registration in progress..." />}
              <form className="auth-form" ref={formRef} onSubmit={handleSubmit}>
                <Input values={values.username} name="username" onChange={handleChange} label="Username" type="username" required />
                {errors.username && <Text className="auth-form__error" variant="b3">{errors.username}</Text>}
                <div className="auth-form__pass-eye-wrapper">
                  <Input values={values.password} name="password" onChange={handleChange} label="Password" type={passVisible ? 'text' : 'password'} required />
                  <IconButton onClick={() => setPassVisible(!passVisible)} src={passVisible ? EyeIC : EyeBlindIC} size="extra-small" />
                </div>
                {errors.password && <Text className="auth-form__error" variant="b3">{errors.password}</Text>}
                <div className="auth-form__pass-eye-wrapper">
                  <Input values={values.confirmPassword} name="confirmPassword" onChange={handleChange} label="Confirm password" type={cPassVisible ? 'text' : 'password'} required />
                  <IconButton onClick={() => setCPassVisible(!cPassVisible)} src={cPassVisible ? EyeIC : EyeBlindIC} size="extra-small" />
                </div>
                {errors.confirmPassword && <Text className="auth-form__error" variant="b3">{errors.confirmPassword}</Text>}
                {isEmail && <Input values={values.email} name="email" onChange={handleChange} label={`Email${isEmailRequired ? '' : ' (optional)'}`} type="email" required={isEmailRequired} />}
                {errors.email && <Text className="auth-form__error" variant="b3">{errors.email}</Text>}
                {errors.other && <Text className="auth-form__error" variant="b3">{errors.other}</Text>}
                <div className="auth-form__btns">
                  <Button variant="primary" type="submit" disabled={isSubmitting}>Register</Button>
                </div>
              </form>
            </>
          )}
        </Formik>
      )}
      {isDisabled && ssoProviders && (
        <SSOButtons
          type="sso"
          identityProviders={ssoProviders.identity_providers}
          baseUrl={baseUrl}
        />
      )}
    </>
  );
}
Register.propTypes = {
  registerInfo: PropTypes.shape({}).isRequired,
  loginFlow: PropTypes.arrayOf(
    PropTypes.shape({}),
  ).isRequired,
  baseUrl: PropTypes.string.isRequired,
};

function AuthCard() {
  const [hsConfig, setHsConfig] = useState(null);
  const [type, setType] = useState('login');

  const handleHsChange = (info) => {
    console.log(info);
    setHsConfig(info);
  };

  return (
    <>
      <Homeserver onChange={handleHsChange} />
      { hsConfig !== null && (
        type === 'login'
          ? <Login loginFlow={hsConfig.login.flows} baseUrl={hsConfig.baseUrl} />
          : (
            <Register
              registerInfo={hsConfig.register}
              loginFlow={hsConfig.login.flows}
              baseUrl={hsConfig.baseUrl}
            />
          )
      )}
      { hsConfig !== null && (
        <Text variant="b2" className="auth-card__switch flex--center">
          {`${(type === 'login' ? 'Don\'t have' : 'Already have')} an account?`}
          <button
            type="button"
            style={{ color: 'var(--tc-link)', cursor: 'pointer', margin: '0 var(--sp-ultra-tight)' }}
            onClick={() => setType((type === 'login') ? 'register' : 'login')}
          >
            { type === 'login' ? ' Register' : ' Login' }
          </button>
        </Text>
      )}
    </>
  );
}

function Auth() {
  const [loginToken, setLoginToken] = useState(getUrlPrams('loginToken'));

  useEffect(async () => {
    if (!loginToken) return;
    if (localStorage.getItem(cons.secretKey.BASE_URL) === undefined) {
      setLoginToken(null);
      return;
    }
    const baseUrl = localStorage.getItem(cons.secretKey.BASE_URL);
    try {
      await auth.loginWithToken(baseUrl, loginToken);

      const { href } = window.location;
      window.location.replace(href.slice(0, href.indexOf('?')));
    } catch {
      setLoginToken(null);
    }
  }, []);

  return (
    <ScrollView invisible>
      <div className="auth__base">
        <div className="auth__wrapper">
          {loginToken && <LoadingScreen message="Redirecting..." />}
          {!loginToken && (
            <div className="auth-card">
              <Header>
                <Avatar size="extra-small" imageSrc={CinnySvg} />
                <TitleWrapper>
                  <Text variant="h2" weight="medium">Cinny</Text>
                </TitleWrapper>
              </Header>
              <div className="auth-card__content">
                <AuthCard />
              </div>
            </div>
          )}
        </div>

        <div className="auth-footer">
          <Text variant="b2">
            <a href="https://cinny.in" target="_blank" rel="noreferrer">About</a>
          </Text>
          <Text variant="b2">
            <a href="https://github.com/ajbura/cinny/releases" target="_blank" rel="noreferrer">{`v${cons.version}`}</a>
          </Text>
          <Text variant="b2">
            <a href="https://twitter.com/cinnyapp" target="_blank" rel="noreferrer">Twitter</a>
          </Text>
          <Text variant="b2">
            <a href="https://matrix.org" target="_blank" rel="noreferrer">Powered by Matrix</a>
          </Text>
        </div>
      </div>
    </ScrollView>
  );
}

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
        <Text variant="s1" weight="medium">{message}</Text>
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
      <form onSubmit={(e) => { e.preventDefault(); onSubmit(); }}>
        <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
          <Text variant="h2" weight="medium">Agree with terms</Text>
          <div style={{ marginBottom: 'var(--sp-normal)' }} />
          <Text variant="b1">In order to complete registration, you need to agree to the terms and conditions.</Text>
          <div style={{ display: 'flex', alignItems: 'center', margin: 'var(--sp-normal) 0' }}>
            <input style={{ marginRight: '8px' }} id="termsCheckbox" type="checkbox" required />
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

function EmailVerify({ email, onContinue }) {
  return (
    <ProcessWrapper>
      <div style={{ margin: 'var(--sp-normal)', maxWidth: '450px' }}>
        <Text variant="h2" weight="medium">Verify email</Text>
        <div style={{ margin: 'var(--sp-normal) 0' }}>
          <Text variant="b1">
            {'Please check your email '}
            <b>{`(${email})`}</b>
            {' and validate before continuing further.'}
          </Text>
        </div>
        <Button variant="primary" onClick={onContinue}>Continue</Button>
      </div>
    </ProcessWrapper>
  );
}
EmailVerify.propTypes = {
  email: PropTypes.string.isRequired,
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
