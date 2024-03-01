import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

export const Content = style([
  DefaultReset,
  {
    paddingLeft: config.space.S500,
    paddingRight: config.space.S100,
    paddingBottom: config.space.S700,
  },
]);

export const ContentHeroSection = style([
  DefaultReset,
  {
    padding: '40px 0',
    maxWidth: toRem(466),
    width: '100%',
    margin: 'auto',
  },
]);

export const ContentBody = style([
  DefaultReset,
  {
    maxWidth: toRem(848),
    width: '100%',
    margin: 'auto',
  },
]);
