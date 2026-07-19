import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const SplashScreen = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
});

export const SplashLogo = style({
  width: toRem(42),
  height: toRem(42),
});

export const SplashScreenFooter = style({
  padding: config.space.S400,
});
