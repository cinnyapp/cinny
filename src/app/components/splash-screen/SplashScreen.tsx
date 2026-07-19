import { Box, Text } from 'folds';
import React, { ReactNode } from 'react';
import classNames from 'classnames';
import * as patternsCSS from '../../styles/Patterns.css';
import * as css from './SplashScreen.css';
import CinnySVG from '../../../../public/res/svg/cinny.svg';

type SplashScreenProps = {
  footer?: ReactNode;
  children?: ReactNode;
};
export function SplashScreen({ footer, children }: SplashScreenProps) {
  return (
    <Box
      className={classNames(css.SplashScreen, patternsCSS.BackgroundDotPattern)}
      direction="Column"
    >
      {children || (
        <Box grow="Yes" direction="Column" alignItems="Center" justifyContent="Center" gap="400">
          <img className={css.SplashLogo} src={CinnySVG} alt="Cinny Logo" />
          <Text size="H2" align="Center">
            Cinny
          </Text>
        </Box>
      )}
      <Box
        className={css.SplashScreenFooter}
        shrink="No"
        alignItems="Center"
        justifyContent="Center"
      >
        {footer}
      </Box>
    </Box>
  );
}
