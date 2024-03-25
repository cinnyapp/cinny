import { style } from '@vanilla-extract/css';
import { DefaultReset, config, toRem } from 'folds';

export const PageHeader = style({
  paddingLeft: config.space.S400,
  paddingRight: config.space.S200,
  borderBottomWidth: config.borderWidth.B300,
});

export const PageContent = style([
  DefaultReset,
  {
    paddingTop: config.space.S400,
    paddingLeft: config.space.S400,
    paddingRight: 0,
    paddingBottom: toRem(100),
  },
]);

export const PageHeroSection = style([
  DefaultReset,
  {
    padding: '40px 0',
    maxWidth: toRem(466),
    width: '100%',
    margin: 'auto',
  },
]);

export const PageContentCenter = style([
  DefaultReset,
  {
    maxWidth: toRem(964),
    width: '100%',
    margin: 'auto',
  },
]);
