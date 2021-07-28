import React, { useState, useEffect } from 'react';
import './Client.scss';

import Text from '../../atoms/text/Text';
import Spinner from '../../atoms/spinner/Spinner';
import Navigation from '../../organisms/navigation/Navigation';
import Channel from '../../organisms/channel/Channel';
import Windows from '../../organisms/pw/Windows';

import initMatrix from '../../../client/initMatrix';

function Client() {
  const [isLoading, changeLoading] = useState(true);

  useEffect(() => {
    initMatrix.once('init_loading_finished', () => {
      changeLoading(false);
    });
    initMatrix.init();
  }, []);

  if (isLoading) {
    return (
      <div className="loading-display">
        <Spinner />
        <Text className="loading__message" variant="b2">Heating up</Text>

        <div className="loading__appname">
          <Text variant="h2">Cinny</Text>
        </div>
      </div>
    );
  }
  return (
    <div className="client-container">
      <div className="navigation__wrapper">
        <Navigation />
      </div>
      <div className="channel__wrapper">
        <Channel />
      </div>
      <Windows />
    </div>
  );
}

export default Client;
