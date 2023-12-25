import cons from './cons';

const isAuthenticated = () => localStorage.getItem(cons.secretKey.ACCESS_TOKEN) !== null;

const getSecret = () => ({
  accessToken: localStorage.getItem(cons.secretKey.ACCESS_TOKEN),
  deviceId: localStorage.getItem(cons.secretKey.DEVICE_ID),
  userId: localStorage.getItem(cons.secretKey.USER_ID),
  baseUrl: localStorage.getItem(cons.secretKey.BASE_URL),
});

export { isAuthenticated, getSecret };
