import React from 'react';
import PropTypes from 'prop-types';
import './SSOButtons.scss';

import { useTranslation } from 'react-i18next';
import { createTemporaryClient, startSsoLogin } from '../../../client/action/auth';

import Button from '../../atoms/button/Button';

import '../../i18n';

function SSOButtons({ type, identityProviders, baseUrl }) {
  const tempClient = createTemporaryClient(baseUrl);
  const { t } = useTranslation();
  function handleClick(id) {
    startSsoLogin(baseUrl, type, id);
  }
  return (
    <div className="sso-buttons">
      {identityProviders
        .sort((idp, idp2) => {
          if (typeof idp.icon !== 'string') return -1;
          return idp.name.toLowerCase() > idp2.name.toLowerCase() ? 1 : -1;
        })
        .map((idp) => (
          idp.icon
            ? (
              <button key={idp.id} type="button" className="sso-btn" onClick={() => handleClick(idp.id)}>
                <img className="sso-btn__img" src={tempClient.mxcUrlToHttp(idp.icon)} alt={idp.name} />
              </button>
            ) : <Button key={idp.id} className="sso-btn__text-only" onClick={() => handleClick(idp.id)}>{t('Molecules.SSOButtons.login_with', { idp_name: idp.name })}</Button>
        ))}
    </div>
  );
}

SSOButtons.propTypes = {
  identityProviders: PropTypes.arrayOf(
    PropTypes.shape({}),
  ).isRequired,
  baseUrl: PropTypes.string.isRequired,
  type: PropTypes.oneOf(['sso', 'cas']).isRequired,
};

export default SSOButtons;
