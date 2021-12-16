import React from 'react';
import './Welcome.scss';

import Text from '../../atoms/text/Text';

import CinnySvg from '../../../../public/res/svg/cinny.svg';

function Welcome() {
  return (
    <div className="app-welcome flex--center">
      <div className="flex-v--center">
        <img className="app-welcome__logo noselect" src={CinnySvg} alt="Cinny logo" />
        <Text className="app-welcome__heading" variant="h1" weight="medium" primary>Welcome to Cinny</Text>
        <Text className="app-welcome__subheading" variant="s1">Yet another matrix client</Text>
      </div>
    </div>
  );
}

export default Welcome;
