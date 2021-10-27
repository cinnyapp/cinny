import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './SSOButtons.scss';

import { createTemporaryClient, getLoginFlows, startSsoLogin } from '../../../client/action/auth';

import Text from '../../atoms/text/Text';

function SSOButtons({ homeserver }) {
  const [identityProviders, setIdentityProviders] = useState([]);

  useEffect(() => {
    // Reset sso proviers to avoid displaying sso icons if the homeserver is not valid
    setIdentityProviders([]);

    // If the homeserver passed in is not a fully-qualified domain name, do not update.
    if (!homeserver.match('^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9](?:\\.[a-zA-Z]{2,})+$')) {
      return;
    }

    // TODO Check that there is a Matrix server at homename before making requests.
    // This will prevent the CORS errors that happen when a user changes their homeserver.
    createTemporaryClient(homeserver).then((client) => {
      const providers = [];
      getLoginFlows(client).then((flows) => {
        if (flows.flows !== undefined) {
          const ssoFlows = flows.flows.filter((flow) => flow.type === 'm.login.sso' || flow.type === 'm.login.cas');
          ssoFlows.forEach((flow) => {
            if (flow.identity_providers !== undefined) {
              const type = flow.type.substring(8);
              flow.identity_providers.forEach((idp) => {
                const imageSrc = client.mxcUrlToHttp(idp.icon);
                providers.push({
                  homeserver, id: idp.id, name: idp.name, type, imageSrc,
                });
              });
            }
          });
        }
        setIdentityProviders(providers);
      }).catch(() => {});
    }).catch(() => {
      setIdentityProviders([]);
    });
  }, [homeserver]);

  if (identityProviders.length === 0) return <></>;

  return (
    <div className="sso-buttons">
      <div className="sso-buttons__divider">
        <Text>OR</Text>
      </div>
      <div className="sso-buttons__container">
        {identityProviders
          // Sort by alphabetical order
          .sort((idp, idp2) => !!idp.imageSrc && idp.name > idp2.name)
          .map((idp) => (
            <SSOButton
              key={idp.id}
              homeserver={idp.homeserver}
              id={idp.id}
              name={idp.name}
              type={idp.type}
              imageSrc={idp.imageSrc}
            />
          ))}
      </div>
    </div>
  );
}

function SSOButton({
  homeserver, id, name, type, imageSrc,
}) {
  const isImageAvail = !!imageSrc;
  function handleClick() {
    startSsoLogin(homeserver, type, id);
  }
  return (
    <button
      type="button"
      className={`sso-btn${!isImageAvail ? ' sso-btn__text-only' : ''}`}
      onClick={handleClick}
    >
      {isImageAvail && <img className="sso-btn__img" src={imageSrc} alt={name} />}
      {!isImageAvail && <Text>{`Login with ${name}`}</Text>}
    </button>
  );
}

SSOButtons.propTypes = {
  homeserver: PropTypes.string.isRequired,
};

SSOButton.propTypes = {
  homeserver: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  type: PropTypes.string.isRequired,
  imageSrc: PropTypes.string.isRequired,
};

export default SSOButtons;
