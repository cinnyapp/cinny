import React from 'react';

import { isAuthenticated } from '../../client/state/auth';
import { SetupCrossSigningUsingPassPhrase } from '../organisms/settings/CrossSigning';

import Auth from '../templates/auth/Auth';
import Client from '../templates/client/Client';

function App() {
  window.addEventListener('CrossSignEvent', async (event) => {
    console.log('Cross Signing Event Handler Triggered');
    const passPhrase = event.detail.passphrase;
    console.log('Pass phrase is: ', passPhrase);
    try{
      await SetupCrossSigningUsingPassPhrase(passPhrase);
      console.log('#######################');
      console.log('Verification Successful');
    } catch (error) {
      console.log('Verification Failed Error Occured');
      console.log(error);
    }
  });
  return isAuthenticated() ? <Client /> : <Auth />;
}

export default App;
