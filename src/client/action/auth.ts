import cons from '../state/cons';

export function updateLocalStore(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  localStorage.setItem(cons.secretKey.ACCESS_TOKEN, accessToken);
  localStorage.setItem(cons.secretKey.DEVICE_ID, deviceId);
  localStorage.setItem(cons.secretKey.USER_ID, userId);
  localStorage.setItem(cons.secretKey.BASE_URL, baseUrl);
}
