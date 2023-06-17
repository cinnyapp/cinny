import React, { StrictMode } from 'react';
import { Provider } from 'jotai';

import { isAuthenticated } from '../../client/state/auth';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

function App() {
  return (
    <StrictMode>
      <Provider>{isAuthenticated() ? <Client /> : <Auth />}</Provider>
    </StrictMode>
  );
}

export default App;
