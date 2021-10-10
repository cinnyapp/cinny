import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './SSOButtons.scss';

import { createTemporaryClient, getLoginFlows, startSsoLogin } from '../../../client/action/auth';

function SSOButtons({ homeserver }) {
  const [identityProviders, setIdentityProviders] = useState([]);

  useEffect(() => {
    // If the homeserver passed in is not a fully-qualified domain name, do not update.
    if (!homeserver.match('(?=^.{4,253}$)(^((?!-)[a-zA-Z0-9-]{1,63}(?<!-).)+[a-zA-Z]{2,63}$)')) {
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

  // TODO Render all non-icon providers at the end so that they are never inbetween icons.
  return (
    <div className="sso-buttons">
      {identityProviders.map((idp) => {
        if (idp.imageSrc == null || idp.imageSrc === undefined || idp.imageSrc === '') {
          return (
            <button
              key={idp.id}
              type="button"
              onClick={() => { startSsoLogin(homeserver, idp.type, idp.id); }}
              className="sso-buttons__fallback-text text-b1"
            >
              {`Log in with ${idp.name}`}
            </button>
          );
        }
        return (
          <SSOButton
            key={idp.id}
            homeserver={idp.homeserver}
            id={idp.id}
            name={idp.name}
            type={idp.type}
            imageSrc={idp.imageSrc}
          />
        );
      })}
    </div>
  );
}

function SSOButton({
  homeserver, id, name, type, imageSrc,
}) {
  function handleClick() {
    startSsoLogin(homeserver, type, id);
  }
  return (
    <button type="button" className="sso-button" onClick={handleClick}>
      <img className="sso-button__img" src={imageSrc} alt={name} />
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
