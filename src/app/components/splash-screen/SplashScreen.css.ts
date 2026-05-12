import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const SplashScreen = style({
  minHeight: '100%',
  color: color.Background.OnContainer,
});

export const SplashScreenFooter = style({
  padding: config.space.S400,
});
