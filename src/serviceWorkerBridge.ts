import { trimTrailingSlash } from './app/utils/common';

const SESSIONS_KEY = 'matrixSessions';

function getActiveSessionFromStorage() {
  try {
    const sessionsJSON = localStorage.getItem(SESSIONS_KEY);
    if (!sessionsJSON) {
      return null;
    }

    const sessions = JSON.parse(sessionsJSON);
    return sessions[0] || null;
  } catch (e) {
    console.error('SW: Error reading or parsing sessions from localStorage', e);
    return null;
  }
}

export const readyServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    const isProduction = import.meta.env.MODE === 'production';
    const swUrl = isProduction
      ? `${trimTrailingSlash(import.meta.env.BASE_URL)}/sw.js`
      : `/dev-sw.js?dev-sw`;

    const swRegisterOptions: RegistrationOptions = {};
    if (!isProduction) {
      swRegisterOptions.type = 'module';
    }

    const showUpdateAvailablePrompt = (registration: ServiceWorkerRegistration) => {
      const DONT_SHOW_PROMPT_KEY = 'cinny_dont_show_sw_update_prompt';
      const userPreference = localStorage.getItem(DONT_SHOW_PROMPT_KEY);

      if (userPreference === 'true') {
        return;
      }

      if (window.confirm('A new version of the app is available. Refresh to update?')) {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING_AND_CLAIM' });
        } else {
          window.location.reload();
        }
      }
    };

    navigator.serviceWorker.register(swUrl, swRegisterOptions).then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker) {
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                showUpdateAvailablePrompt(registration);
              }
            }
          };
        }
      };
    });

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (!event.data || !event.source) {
        return;
      }

      if (event.data.type === 'token' && event.data.id) {
        const session = getActiveSessionFromStorage()
        event.source.postMessage({
            replyTo: event.data.id,
            payload: {
           token: session.accessToken ?? undefined,
           homeserverUrl: session?.baseUrl ?? undefined,
            },
        });
      } else if (event.data.type === 'openRoom' && event.data.id) {
        /* Example:
        event.source.postMessage({
          replyTo: event.data.id,
          payload: success?,
        });
        */
      }
    });
  }
};
