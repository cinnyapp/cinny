import React from 'react';
import {
  BrowserRouter, Switch, Route, Redirect,
} from 'react-router-dom';

import { isAuthenticated } from '../../client/state/auth';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

function App() {
  return (
    <BrowserRouter>
      <Switch>
        <Route exact path="/">
          { isAuthenticated() ? <Client /> : <Redirect to="/login" />}
        </Route>
        <Route path="/login">
          { isAuthenticated() ? <Redirect to="/" /> : <Auth type="login" />}
        </Route>
        <Route path="/register">
          { isAuthenticated() ? <Redirect to="/" /> : <Auth type="register" />}
        </Route>
      </Switch>
    </BrowserRouter>
  );
}

export default App;
