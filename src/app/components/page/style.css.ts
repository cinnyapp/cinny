import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const PageNav = style({
  width: toRem(256),
});

export const PageNavHeader = style({
  padding: `0 ${config.space.S200} 0 ${config.space.S300}`,
  flexShrink: 0,
  borderBottomWidth: 1,

  selectors: {
    'button&': {
      cursor: 'pointer',
    },
    'button&[aria-pressed=true]': {
      backgroundColor: color.Background.ContainerActive,
    },
    'button&:hover, button&:focus-visible': {
      backgroundColor: color.Background.ContainerHover,
    },
    'button&:active': {
      backgroundColor: color.Background.ContainerActive,
    },
  },
});

export const PageNavContent = style({
  minHeight: '100%',
  padding: config.space.S200,
  paddingRight: 0,
  paddingBottom: config.space.S700,
});

export const PageHeader = recipe({
  base: {
    paddingLeft: config.space.S400,
    paddingRight: config.space.S200,
    borderBottomWidth: config.borderWidth.B300,
  },
  variants: {
    balance: {
      true: {
        paddingLeft: config.space.S200,
      },
    },
  },
});
export type PageHeaderVariants = RecipeVariants<typeof PageHeader>;

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
