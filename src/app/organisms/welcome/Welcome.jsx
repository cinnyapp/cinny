import React from 'react';
import './Welcome.scss';
import { useTranslation } from 'react-i18next';

import Text from '../../atoms/text/Text';

import CinnySvg from '../../../../public/res/svg/cinny.svg';

function Welcome() {
  const { t } = useTranslation();

  return (
    <div className="app-welcome flex--center">
      <div>
        <img className="app-welcome__logo noselect" src={CinnySvg} alt="Cinny logo" />
        <Text className="app-welcome__heading" variant="h1" weight="medium" primary>{t('Organisms.Welcome.heading')}</Text>
        <Text className="app-welcome__subheading" variant="s1">{t('Organisms.Welcome.subheading')}</Text>
      </div>
    </div>
  );
}

export default Welcome;
