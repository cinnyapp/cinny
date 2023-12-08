/* eslint-disable import/first */
import React from 'react';
import ReactDom from 'react-dom';
import { enableMapSet } from 'immer';
import '@fontsource/inter/variable.css';
import 'folds/dist/style.css';
import { configClass, varsClass } from 'folds';

enableMapSet();

import './index.scss';

import settings from './client/state/settings';

import App from './app/pages/App';

// import i18n (needs to be bundled ;))
import './app/i18n';

document.body.classList.add(configClass, varsClass);

settings.applyTheme();

ReactDom.render(<App />, document.getElementById('root'));
