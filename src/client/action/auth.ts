import { setLocalStorageItem } from '../../app/state/utils/atomWithLocalStorage';
import { Session } from '../../app/state/sessions';

export function updateLocalStore(
  accessToken: string,
  deviceId: string,
  userId: string,
  baseUrl: string
) {
  const newSession: Session = {
    accessToken,
    deviceId,
    userId,
    baseUrl,
    fallbackSdkStores: false,
  };

  setLocalStorageItem('matrixSessions', [newSession]);
}
