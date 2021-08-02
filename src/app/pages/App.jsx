import React from 'react';
import {
  BrowserRouter, Switch, Route, Redirect,
} from 'react-router-dom';

import { isAuthanticated } from '../../client/state/auth';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

function App() {
  return (
    <BrowserRouter>
      <Switch>
         { isAuthanticated() ? <Client /> : <Auth type="login" />}
      </Switch>
    </BrowserRouter>
  );
}

export default App;
