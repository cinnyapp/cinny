import React from 'react';
import {
  BrowserRouter,
} from 'react-router-dom';

import { isAuthenticated } from '../../client/state/auth';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

function App() {
  return (
    <BrowserRouter>
      { isAuthenticated() ? <Client /> : <Auth />}
    </BrowserRouter>
  );
}

export default App;
