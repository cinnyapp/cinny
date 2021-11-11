import * as sdk from 'matrix-js-sdk';
import cons from '../state/cons';

function updateLocalStore(accessToken, deviceId, userId, baseUrl) {
  localStorage.setItem(cons.secretKey.ACCESS_TOKEN, accessToken);
  localStorage.setItem(cons.secretKey.DEVICE_ID, deviceId);
  localStorage.setItem(cons.secretKey.USER_ID, userId);
  localStorage.setItem(cons.secretKey.BASE_URL, baseUrl);
}

function createTemporaryClient(baseUrl) {
  return sdk.createClient({ baseUrl });
}

async function startSsoLogin(baseUrl, type, idpId) {
  const client = createTemporaryClient(baseUrl);
  localStorage.setItem(cons.secretKey.BASE_URL, client.baseUrl);
  window.location.href = client.getSsoLoginUrl(window.location.href, type, idpId);
}

async function login(baseUrl, username, email, password) {
  const identifier = {};
  if (username) {
    identifier.type = 'm.id.user';
    identifier.user = username;
  } else if (email) {
    identifier.type = 'm.id.thirdparty';
    identifier.medium = 'email';
    identifier.address = email;
  } else throw new Error('Bad Input');

  const client = createTemporaryClient(baseUrl);
  const res = await client.login('m.login.password', {
    identifier,
    password,
    initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
  });

  const myBaseUrl = res?.well_known?.['m.homeserver']?.base_url || client.baseUrl;
  updateLocalStore(res.access_token, res.device_id, res.user_id, myBaseUrl);
}

async function loginWithToken(baseUrl, token) {
  const client = createTemporaryClient(baseUrl);

  const res = await client.login('m.login.token', {
    token,
    initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
  });

  const myBaseUrl = res?.well_known?.['m.homeserver']?.base_url || client.baseUrl;
  updateLocalStore(res.access_token, res.device_id, res.user_id, myBaseUrl);
}

// eslint-disable-next-line camelcase
async function verifyEmail(baseUrl, email, client_secret, send_attempt, next_link) {
  const res = await fetch(`${baseUrl}/_matrix/client/r0/register/email/requestToken`, {
    method: 'POST',
    body: JSON.stringify({
      email, client_secret, send_attempt, next_link,
    }),
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
    },
    credentials: 'same-origin',
  });
  const data = await res.json();
  return data;
}

async function completeRegisterStage(
  baseUrl, username, password, auth,
) {
  const tempClient = createTemporaryClient(baseUrl);

  try {
    const result = await tempClient.registerRequest({
      username,
      password,
      auth,
      initial_device_display_name: cons.DEVICE_DISPLAY_NAME,
    });
    const data = { completed: result.completed || [] };
    if (result.access_token) {
      data.done = true;
      updateLocalStore(result.access_token, result.device_id, result.user_id, baseUrl);
    }
    return data;
  } catch (e) {
    const result = e.data;
    const data = { completed: result.completed || [] };
    if (result.access_token) {
      data.done = true;
      updateLocalStore(result.access_token, result.device_id, result.user_id, baseUrl);
    }
    return data;
  }
}

export {
  createTemporaryClient, login, verifyEmail,
  loginWithToken, startSsoLogin,
  completeRegisterStage,
};
