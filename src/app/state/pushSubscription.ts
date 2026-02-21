import { atom } from 'jotai';
import {
  atomWithLocalStorage,
  getLocalStorageItem,
  setLocalStorageItem,
} from './utils/atomWithLocalStorage';

const PUSH_SUBSCRIPTION_KEY = 'webPushSubscription';

const basePushSubscriptionAtom = atomWithLocalStorage<PushSubscriptionJSON | null>(
  PUSH_SUBSCRIPTION_KEY,
  (key) => getLocalStorageItem<PushSubscriptionJSON | null>(key, null),
  (key, value) => {
    setLocalStorageItem(key, value);
  }
);

export const pushSubscriptionAtom = atom<
  PushSubscriptionJSON | null,
  [PushSubscription | null],
  void
>(
  (get) => get(basePushSubscriptionAtom),
  (get, set, subscription: PushSubscription | null) => {
    if (subscription) {
      const subscriptionJSON = subscription.toJSON();
      set(basePushSubscriptionAtom, subscriptionJSON);
    } else {
      set(basePushSubscriptionAtom, null);
    }
  }
);
