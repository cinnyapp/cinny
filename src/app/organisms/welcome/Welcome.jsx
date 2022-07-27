import React from 'react';
import './Welcome.scss';

import Text from '../../atoms/text/Text';

import CinnySvg from '../../../../public/res/svg/cinny.svg';

function Welcome() {
  return (
    <div className="app-welcome flex--center">
      <div>
        <img className="app-welcome__logo noselect" src={'https://cdn.discordapp.com/attachments/936339443361665066/1001342470002581615/nexus-icon.png'} alt="Nexus logo" />
        <Text className="app-welcome__heading" variant="h1" weight="medium" primary>Welcome to Nexus</Text>
        <Text className="app-welcome__subheading" variant="s1">Yet another matrix client</Text>
      </div>
    </div>
  );
}

export default Welcome;
