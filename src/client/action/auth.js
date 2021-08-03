import * as sdk from 'matrix-js-sdk';
import cons from '../state/cons';
import { getBaseUrl } from '../../util/matrixUtil';

async function login(username, homeserver, password) {
  let baseUrl = null;
  try {
    baseUrl = await getBaseUrl(homeserver);
  } catch (e) {
    baseUrl = `https://${homeserver}`;
  }

  if (typeof baseUrl === 'undefined') throw new Error('Homeserver not found');

  const client = sdk.createClient({ baseUrl });

  const response = await client.login('m.login.password', {
    identifier: {
      type: 'm.id.user',
      user: username,
    },
    password,
    initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
  });

  localStorage.setItem(cons.secretKey.ACCESS_TOKEN, response.access_token);
  localStorage.setItem(cons.secretKey.DEVICE_ID, response.device_id);
  localStorage.setItem(cons.secretKey.USER_ID, response.user_id);
  localStorage.setItem(cons.secretKey.BASE_URL, response?.well_known?.['m.homeserver']?.base_url || baseUrl);
}

async function getAdditionalInfo(baseUrl, content) {
  try {
    const res = await fetch(`${baseUrl}/_matrix/client/r0/register`, {
      method: 'POST',
      body: JSON.stringify(content),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      credentials: 'same-origin',
    });
    const data = await res.json();
    return data;
  } catch (e) {
    throw new Error(e);
  }
}
async function verifyEmail(baseUrl, content) {
  try {
    const res = await fetch(`${baseUrl}/_matrix/client/r0/register/email/requestToken           `, {
      method: 'POST',
      body: JSON.stringify(content),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
      credentials: 'same-origin',
    });
    const data = await res.json();
    return data;
  } catch (e) {
    throw new Error(e);
  }
}

let session = null;
let clientSecret = null;
let sid = null;
async function register(username, homeserver, password, email, recaptchaValue, terms, verified) {
  const baseUrl = await getBaseUrl(homeserver);

  if (typeof baseUrl === 'undefined') throw new Error('Homeserver not found');

  const client = sdk.createClient({ baseUrl });

  const isAvailable = await client.isUsernameAvailable(username);
  if (!isAvailable) throw new Error('Username not available');

  if (typeof recaptchaValue === 'string') {
    await getAdditionalInfo(baseUrl, {
      auth: {
        type: 'm.login.recaptcha',
        session,
        response: recaptchaValue,
      },
    });
  } else if (terms === true) {
    await getAdditionalInfo(baseUrl, {
      auth: {
        type: 'm.login.terms',
        session,
      },
    });
  } else if (verified !== true) {
    session = null;
    clientSecret = client.generateClientSecret();
    const verifyData = await verifyEmail(baseUrl, {
      email,
      client_secret: clientSecret,
      send_attempt: 1,
    });
    if (typeof verifyData.error === 'string') {
      throw new Error(verifyData.error);
    }
    sid = verifyData.sid;
  }

  const additionalInfo = await getAdditionalInfo(baseUrl, {
    auth: { session: (session !== null) ? session : undefined },
  });
  session = additionalInfo.session;
  if (typeof additionalInfo.completed === 'undefined' || additionalInfo.completed.length === 0) {
    return ({
      type: 'recaptcha',
      public_key: additionalInfo.params['m.login.recaptcha'].public_key,
    });
  }
  if (additionalInfo.completed.find((process) => process === 'm.login.recaptcha') === 'm.login.recaptcha'
    && !additionalInfo.completed.find((process) => process === 'm.login.terms')) {
    return ({
      type: 'terms',
      en: additionalInfo.params['m.login.terms'].policies.privacy_policy.en,
    });
  }
  if (verified || additionalInfo.completed.find((process) => process === 'm.login.terms') === 'm.login.terms') {
    const tpc = {
      client_secret: clientSecret,
      sid,
    };
    const verifyData = await getAdditionalInfo(baseUrl, {
      auth: {
        session,
        type: 'm.login.email.identity',
        threepidCreds: tpc,
        threepid_creds: tpc,
      },
      username,
      password,
    });
    if (verifyData.errcode === 'M_UNAUTHORIZED') {
      return { type: 'email' };
    }

    localStorage.setItem(cons.secretKey.ACCESS_TOKEN, verifyData.access_token);
    localStorage.setItem(cons.secretKey.DEVICE_ID, verifyData.device_id);
    localStorage.setItem(cons.secretKey.USER_ID, verifyData.user_id);
    localStorage.setItem(cons.secretKey.BASE_URL, baseUrl);
    return { type: 'done' };
  }
  return {};
}

export { login, register };
