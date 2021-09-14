import cons from './cons';

function getSecret(key) {
  return localStorage.getItem(key);
}

const isAuthenticated = () => getSecret(cons.secretKey.ACCESS_TOKEN) !== null;

const secret = {
  accessToken: getSecret(cons.secretKey.ACCESS_TOKEN),
  deviceId: getSecret(cons.secretKey.DEVICE_ID),
  userId: getSecret(cons.secretKey.USER_ID),
  baseUrl: getSecret(cons.secretKey.BASE_URL),
};

export {
  isAuthenticated,
  secret,
};
