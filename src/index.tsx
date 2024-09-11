/* eslint-disable import/first */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { enableMapSet } from 'immer';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';

enableMapSet();

import './index.scss';

import settings from './client/state/settings';

import { trimTrailingSlash } from './app/utils/common';
import App from './app/pages/App';

// import i18n (needs to be bundled ;))
import './app/i18n';

document.body.classList.add(configClass, varsClass);
settings.applyTheme();

const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    const swUrl =
      import.meta.env.MODE === 'production'
        ? `${trimTrailingSlash(import.meta.env.BASE_URL)}/sw.js`
        : `/dev-sw.js?dev-sw`;

    await navigator.serviceWorker.register(swUrl);

    navigator.serviceWorker.ready.then((registration) => {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'token' && event.data?.messageId) {
          const token = localStorage.getItem('cinny_access_token') ?? undefined;
          registration.active?.postMessage({
            messageId: event.data.messageId,
            token,
          });
        }
      });
    });
  }
};

window.addEventListener('load', registerServiceWorker);

const mountApp = () => {
  const rootContainer = document.getElementById('root');

  if (rootContainer === null) {
    console.error('Root container element not found!');
    return;
  }

  const root = createRoot(rootContainer);
  root.render(<App />);
};

mountApp();
