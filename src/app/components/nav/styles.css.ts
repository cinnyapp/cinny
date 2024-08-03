import { ComplexStyleRule, createVar, style } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { ContainerColor, DefaultReset, Disabled, RadiiVariant, color, config, toRem } from 'folds';

export const NavCategory = style([
  DefaultReset,
  {
    position: 'relative',
  },
]);

export const NavCategoryHeader = style({
  gap: config.space.S100,
});

export const NavLink = style({
  color: 'inherit',
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  cursor: 'pointer',
  flexGrow: 1,
  ':hover': {
    textDecoration: 'unset',
  },
  ':focus': {
    outline: 'none',
  },
});

const Container = createVar();
const ContainerHover = createVar();
const ContainerActive = createVar();
const ContainerLine = createVar();
const OnContainer = createVar();

const getVariant = (variant: ContainerColor): ComplexStyleRule => ({
  vars: {
    [Container]: color[variant].Container,
    [ContainerHover]: color[variant].ContainerHover,
    [ContainerActive]: color[variant].ContainerActive,
    [ContainerLine]: color[variant].ContainerLine,
    [OnContainer]: color[variant].OnContainer,
  },
});

const NavItemBase = style({
  width: '100%',
  display: 'flex',
  justifyContent: 'start',
  cursor: 'pointer',
  backgroundColor: Container,
  color: OnContainer,
  outline: 'none',
  minHeight: toRem(36),

  selectors: {
    '&:hover, &:focus-visible': {
      backgroundColor: ContainerHover,
    },
    '&[data-hover=true]': {
      backgroundColor: ContainerHover,
    },
    [`&:has(.${NavLink}:active)`]: {
      backgroundColor: ContainerActive,
    },
    '&[aria-selected=true]': {
      backgroundColor: ContainerActive,
    },
    [`&:has(.${NavLink}:focus-visible)`]: {
      outline: `${config.borderWidth.B600} solid ${ContainerLine}`,
      outlineOffset: `calc(-1 * ${config.borderWidth.B600})`,
    },
  },
  '@supports': {
    [`not selector(:has(.${NavLink}:focus-visible))`]: {
      ':focus-within': {
        outline: `${config.borderWidth.B600} solid ${ContainerLine}`,
        outlineOffset: `calc(-1 * ${config.borderWidth.B600})`,
      },
    },
  },
});
export const NavItem = recipe({
  base: [DefaultReset, NavItemBase, Disabled],
  variants: {
    variant: {
      Background: getVariant('Background'),
      Surface: getVariant('Surface'),
      SurfaceVariant: getVariant('SurfaceVariant'),
      Primary: getVariant('Primary'),
      Secondary: getVariant('Secondary'),
      Success: getVariant('Success'),
      Warning: getVariant('Warning'),
      Critical: getVariant('Critical'),
    },
    radii: RadiiVariant,
  },
  defaultVariants: {
    variant: 'Surface',
    radii: '400',
  },
});

export type RoomSelectorVariants = RecipeVariants<typeof NavItem>;
export const NavItemContent = style({
  paddingLeft: config.space.S200,
  paddingRight: config.space.S300,
  height: 'inherit',
  minWidth: 0,
  flexGrow: 1,
  display: 'flex',
  alignItems: 'center',
  fontWeight: config.fontWeight.W500,

  selectors: {
    '&:hover': {
      textDecoration: 'unset',
    },
    [`.${NavItemBase}[data-highlight=true] &`]: {
      fontWeight: config.fontWeight.W600,
    },
  },
});

export const NavItemOptions = style({
  paddingRight: config.space.S200,
});
