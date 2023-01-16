import React from 'react';

import { isAuthenticated } from '../../client/state/auth';
import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

import {
  handleCrossSigningEventsChannel,
  handleEncryptionKeysExportEvent,
  handleEncryptionKeysImportEvent,
} from '../../shire/EventsChannel';

function App() {
  handleCrossSigningEventsChannel();
  handleEncryptionKeysExportEvent();
  handleEncryptionKeysImportEvent();
  return isAuthenticated() ? <Client /> : <Auth />;
}

export default App;
