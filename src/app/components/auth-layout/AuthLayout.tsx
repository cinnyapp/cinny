import React, { ReactNode } from 'react';
import { Box, Header, Scroll } from 'folds';
import classNames from 'classnames';

import * as css from './styles.css';
import * as PatternsCss from '../../styles/Patterns.css';
import CinnySVG from '../../../../public/res/svg/cinny.svg';
import { AuthFooter } from './AuthFooter';

export function AuthLogo({ large }: { large?: boolean }) {
  return <img className={css.AuthLogo({ large })} src={CinnySVG} alt="Cinny Logo" />;
}

type AuthLayoutProps = {
  center?: boolean;
  children?: ReactNode;
  header?: ReactNode;
};
export function AuthLayout({ center, header, children }: AuthLayoutProps) {
  return (
    <Scroll variant="Background" visibility="Hover" size="0" hideTrack>
      <Box
        className={classNames(css.AuthLayout, PatternsCss.BackgroundDotPattern)}
        direction="Column"
        alignItems="Center"
        gap="400"
      >
        <Box
          style={{ width: '100%' }}
          justifyContent={center ? 'Center' : undefined}
          alignItems="Center"
          direction="Column"
        >
          <Box direction="Column" className={css.AuthCard}>
            {header && (
              <Header className={css.AuthHeader} size="600" variant="Surface">
                {header}
              </Header>
            )}

            <Box className={css.AuthCardContent} direction="Column">
              {children}
            </Box>
          </Box>
        </Box>
        <AuthFooter />
      </Box>
    </Scroll>
  );
}
