import React from 'react';
import Text from '../../atoms/text/Text';
import TwypeSvg from '../../../../public/res/svg/twype.svg';

import './Welcome.scss';

function Welcome() {
  return (
    <div className="app-welcome flex--center">
      <div>
        <img className="app-welcome__logo noselect" src={TwypeSvg} alt="Twype logo" />
        <Text className="app-welcome__heading" variant="h1" weight="medium" primary>Welcome to Twype</Text>
        <Text className="app-welcome__subheading" variant="s1">Yet another matrix client</Text>
      </div>
    </div>
  );
}

export default Welcome;
