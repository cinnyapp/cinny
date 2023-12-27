import { Avatar, AvatarImage, Box, Button, Text } from 'folds';
import { IIdentityProvider, createClient } from 'matrix-js-sdk';
import React, { useMemo } from 'react';
import { useAutoDiscoveryInfo } from '../../hooks/useAutoDiscoveryInfo';

type SSOLoginProps = {
  providers: IIdentityProvider[];
  asIcons?: boolean;
};
export function SSOLogin({ providers, asIcons }: SSOLoginProps) {
  const discovery = useAutoDiscoveryInfo();
  const baseUrl = discovery['m.homeserver'].base_url;
  const mx = useMemo(() => createClient({ baseUrl }), [baseUrl]);

  const getSSOIdUrl = (ssoId: string): string => {
    // remove query params and use current url as redirect
    const [redirectUrl] = window.location.href.split('?');
    return mx.getSsoLoginUrl(redirectUrl, 'sso', ssoId);
  };

  return (
    <Box justifyContent="Center" gap="600" wrap="Wrap">
      {providers.map((provider) => {
        const { id, name, icon } = provider;
        const iconUrl = icon && mx.mxcUrlToHttp(icon, 96, 96, 'crop', false);

        const buttonTitle = `Continue with ${name}`;

        // Only show SSO buttons as icons if we have
        // high number of SSO buttons to display
        if (iconUrl && asIcons && providers.length > 2) {
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
      })}
    </Box>
  );
}
