import { Avatar, AvatarImage, Box, Button, Text } from 'folds';
import { IdentityProvider } from 'neurone/lib/api/types';
import React from 'react';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';
import { mxcToHttp } from '../../../client/mxcToHttp';

const UNSTABLE_ACTION_PARAM = 'org.matrix.msc3824.action';
type SSOAction = 'login' | 'register';

function getSsoLoginUrl(
  baseUrl: string,
  redirectUrl: string,
  idpId?: string,
  action?: SSOAction
): string {
  let path = '_matrix/client/v3/login/sso/redirect';
  if (idpId) {
    path += `/${idpId}`;
  }
  const url = new URL(path, baseUrl);

  url.searchParams.append('redirectUrl', redirectUrl);
  if (action) {
    url.searchParams.append(UNSTABLE_ACTION_PARAM, action);
  }

  return url.href;
}

type SSOLoginProps = {
  providers?: IdentityProvider[];
  redirectUrl: string;
  action?: SSOAction;
  saveScreenSpace?: boolean;
};
export function SSOLogin({ providers, redirectUrl, action, saveScreenSpace }: SSOLoginProps) {
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;

  const getSSOIdUrl = (ssoId?: string): string =>
    getSsoLoginUrl(baseUrl, redirectUrl, ssoId, action);

  const withoutIcon = providers
    ? providers.find(
        ({ icon }) =>
          !icon ||
          !mxcToHttp(baseUrl, icon, false).thumbnail({ width: 96, height: 96, method: 'crop' })
      )
    : true;

  const renderAsIcons = withoutIcon ? false : saveScreenSpace && providers && providers.length > 2;

  return (
    <Box justifyContent="Center" gap="600" wrap="Wrap">
      {providers ? (
        providers.map((provider) => {
          const { id, name, icon } = provider;
          const iconUrl =
            icon &&
            mxcToHttp(baseUrl, icon, false).thumbnail({
              width: 96,
              height: 96,
              method: 'crop',
            });

          const buttonTitle = `Continue with ${name}`;

          if (renderAsIcons) {
            return (
              <Avatar
                style={{ cursor: 'pointer' }}
                key={id}
                as="a"
                href={getSSOIdUrl(id)}
                aria-label={buttonTitle}
                size="300"
                radii="300"
              >
                <AvatarImage src={iconUrl} alt={name} title={buttonTitle} />
              </Avatar>
            );
          }

          return (
            <Button
              style={{ width: '100%' }}
              key={id}
              as="a"
              href={getSSOIdUrl(id)}
              size="500"
              variant="Secondary"
              fill="Soft"
              outlined
              before={
                iconUrl && (
                  <Avatar size="200" radii="300">
                    <AvatarImage src={iconUrl} alt={name} />
                  </Avatar>
                )
              }
            >
              <Text align="Center" size="B500" truncate>
                {buttonTitle}
              </Text>
            </Button>
          );
        })
      ) : (
        <Button
          style={{ width: '100%' }}
          as="a"
          href={getSSOIdUrl()}
          size="500"
          variant="Secondary"
          fill="Soft"
          outlined
        >
          <Text align="Center" size="B500" truncate>
            Continue with SSO
          </Text>
        </Button>
      )}
    </Box>
  );
}
