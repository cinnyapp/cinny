import { MatrixClient } from 'matrix-js-sdk';
import { ClientConfig } from '../../../hooks/useClientConfig';

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    return 'denied';
  }
  try {
    const permission: NotificationPermission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return 'denied';
  }
}

export async function enablePushNotifications(
  mx: MatrixClient,
  clientConfig: ClientConfig,
  pushSubscriptionAtom: Atom<PushSubscriptionJSON | null, [PushSubscription | null], void>
): Promise<void> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push messaging is not supported in this browser.');
  }
  const [pushSubAtom, setPushSubscription] = pushSubscriptionAtom;
  const registration = await navigator.serviceWorker.ready;
  const currentBrowserSub = await registration.pushManager.getSubscription();

  /* Self-Healing Check. Effectively checks if the browser has invalidated our subscription and recreates it 
     only when necessary. This prevents us from needing an external call to get back the web push info. 
  */
  if (currentBrowserSub && pushSubAtom && currentBrowserSub.endpoint === pushSubAtom.endpoint) {
    console.error('Valid saved subscription found. Ensuring pusher is enabled on homeserver...');
    const pusherData = {
      kind: 'http' as const,
      app_id: clientConfig.pushNotificationDetails?.webPushAppID,
      pushkey: pushSubAtom.keys!.p256dh!,
      app_display_name: 'Cinny',
      device_display_name: 'This Browser',
      lang: navigator.language || 'en',
      data: {
        url: clientConfig.pushNotificationDetails?.pushNotifyUrl,
        format: 'event_id_only' as const,
        endpoint: pushSubAtom.endpoint,
        p256dh: pushSubAtom.keys!.p256dh!,
        auth: pushSubAtom.keys!.auth!,
      },
      append: false,
    };
    navigator.serviceWorker.controller?.postMessage({
      url: mx.baseUrl,
      type: 'togglePush',
      pusherData,
      token: mx.getAccessToken(),
    });
    return;
  }

  console.error('No valid saved subscription. Performing full, new subscription...');

  if (currentBrowserSub) {
    await currentBrowserSub.unsubscribe();
  }

  const newSubscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: clientConfig.pushNotificationDetails?.vapidPublicKey,
  });

  setPushSubscription(newSubscription);

  const subJson = newSubscription.toJSON();
  const pusherData = {
    kind: 'http' as const,
    app_id: clientConfig.pushNotificationDetails?.webPushAppID,
    pushkey: subJson.keys!.p256dh!,
    app_display_name: 'Cinny',
    device_display_name:
      (await mx.getDevice(mx.getDeviceId() ?? '')).display_name ?? 'Unknown Device',
    lang: navigator.language || 'en',
    data: {
      url: clientConfig.pushNotificationDetails?.pushNotifyUrl,
      format: 'event_id_only' as const,
      endpoint: newSubscription.endpoint,
      p256dh: subJson.keys!.p256dh!,
      auth: subJson.keys!.auth!,
    },
    append: false,
  };

  navigator.serviceWorker.controller?.postMessage({
    url: mx.baseUrl,
    type: 'togglePush',
    pusherData,
    token: mx.getAccessToken(),
  });
}

/**
 * Disables push notifications by telling the homeserver to delete the pusher,
 * but keeps the browser subscription locally for a fast re-enable.
 */
export async function disablePushNotifications(
  mx: MatrixClient,
  clientConfig: ClientConfig,
  pushSubscriptionAtom: Atom<PushSubscriptionJSON | null, [PushSubscription | null], void>
): Promise<void> {
  const [pushSubAtom] = pushSubscriptionAtom;

  const pusherData = {
    kind: null,
    app_id: clientConfig.pushNotificationDetails?.webPushAppID,
    pushkey: pushSubAtom?.keys?.p256dh,
  };

  navigator.serviceWorker.controller?.postMessage({
    url: mx.baseUrl,
    type: 'togglePush',
    pusherData,
    token: mx.getAccessToken(),
  });
}

export async function deRegisterAllPushers(mx: MatrixClient): Promise<void> {
  const response = await mx.getPushers();
  const pushers = response.pushers || [];
  if (pushers.length === 0) return;

  const deletionPromises = pushers.map((pusher) => {
    const pusherToDelete = {
      kind: null,
      app_id: pusher.app_id,
      pushkey: pusher.pushkey,
    };
    return mx.setPusher(pusherToDelete as any);
  });

  await Promise.allSettled(deletionPromises);
}

export async function togglePusher(
  mx: MatrixClient,
  clientConfig: ClientConfig,
  visible: boolean,
  usePushNotifications: boolean,
  pushSubscriptionAtom: Atom<PushSubscriptionJSON | null, [PushSubscription | null], void>
): Promise<void> {
  if (usePushNotifications) {
    if (visible) {
      await disablePushNotifications(mx, clientConfig, pushSubscriptionAtom);
    } else {
      await enablePushNotifications(mx, clientConfig, pushSubscriptionAtom);
    }
  }
}
