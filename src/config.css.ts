import { createTheme } from '@vanilla-extract/css';
import { config } from 'folds';

export const onLightFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '420',
  W500: '500',
  W600: '600',
  W700: '700',
  W800: '800',
  W900: '900',
});

export const onDarkFontWeight = createTheme(config.fontWeight, {
  W100: '100',
  W200: '200',
  W300: '300',
  W400: '350',
  W500: '450',
  W600: '550',
  W700: '650',
  W800: '750',
  W900: '850',
});
