import React from 'react';

import { isAuthenticated } from '../../client/state/auth';
import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

import { CrossSigningEventHandler, MessagesBackupEventHandler } from '../../shire/EventsChannel';

function App() {
  // CrossSigningEventHandler();
  // MessagesBackupEventHandler();
  return isAuthenticated() ? <Client /> : <Auth />;
}

export default App;
