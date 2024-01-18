import React from 'react';
import { Provider as JotaiProvider } from 'jotai';
import {
  Route,
  RouterProvider,
  createBrowserRouter,
  createRoutesFromElements,
  redirect,
} from 'react-router-dom';

import { ClientConfigLoader } from '../components/ClientConfigLoader';
import { ClientConfig, ClientConfigProvider } from '../hooks/useClientConfig';
import { AuthLayout, Login, Register, authLayoutLoader } from './auth';
import { LOGIN_PATH, REGISTER_PATH, RESET_PASSWORD_PATH, ROOT_PATH } from './paths';
import { isAuthenticated } from '../../client/state/auth';
import Client from '../templates/client/Client';
import { getLoginPath } from './pathUtils';

const createRouter = (clientConfig: ClientConfig) => {
  const { basename } = clientConfig;
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route>
        <Route
          path={ROOT_PATH}
          loader={() => {
            if (isAuthenticated()) return redirect('/home');
            return redirect(getLoginPath());
          }}
        />
        <Route loader={authLayoutLoader} element={<AuthLayout />}>
          <Route path={LOGIN_PATH} element={<Login />} />
          <Route path={REGISTER_PATH} element={<Register />} />
          <Route path={RESET_PASSWORD_PATH} element={<span>Reset Password</span>} />
        </Route>

        <Route
          loader={() => {
            if (!isAuthenticated()) return redirect(getLoginPath());
            return null;
          }}
        >
          <Route path="/home" element={<Client />} />
          <Route path="/direct" element={<p>direct</p>} />
          <Route path="/:spaceIdOrAlias" element={<p>:spaceIdOrAlias</p>} />
          <Route path="/explore" element={<p>explore</p>} />
        </Route>
        <Route path="/*" element={<p>Page not found</p>} />
      </Route>
    ),
    { basename }
  );
  return router;
};

// TODO: app crash boundary
function App() {
  return (
    // TODO: initial loading screen
    <ClientConfigLoader fallback={() => <p>loading</p>}>
      {(clientConfig) => (
        <ClientConfigProvider value={clientConfig}>
          <JotaiProvider>
            <RouterProvider router={createRouter(clientConfig)} />
          </JotaiProvider>
        </ClientConfigProvider>
      )}
    </ClientConfigLoader>
  );
}

export default App;
