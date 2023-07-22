import { style } from '@vanilla-extract/css';
import { recipe, RecipeVariants } from '@vanilla-extract/recipes';
import { color, config, DefaultReset, toRem } from 'folds';

export const Sidebar = style([
  DefaultReset,
  {
    width: toRem(66),
    backgroundColor: color.Background.Container,
    borderRight: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,

    display: 'flex',
    flexDirection: 'column',
    color: color.Background.OnContainer,
  },
]);

export const SidebarStack = style([
  DefaultReset,
  {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: config.space.S300,
    padding: `${config.space.S300} 0`,
  },
]);

const PUSH_X = 2;
export const SidebarAvatarBox = recipe({
  base: [
    DefaultReset,
    {
      display: 'flex',
      alignItems: 'center',
      position: 'relative',
      transition: 'transform 200ms cubic-bezier(0, 0.8, 0.67, 0.97)',

      selectors: {
        '&:hover': {
          transform: `translateX(${toRem(PUSH_X)})`,
        },
        '&::before': {
          content: '',
          display: 'none',
          position: 'absolute',
          left: toRem(-11.5 - PUSH_X),
          width: toRem(3 + PUSH_X),
          height: toRem(16),
          borderRadius: `0 ${toRem(4)} ${toRem(4)} 0`,
          background: 'CurrentColor',
          transition: 'height 200ms linear',
        },
        '&:hover::before': {
          display: 'block',
          width: toRem(3),
        },
      },
    },
  ],
  variants: {
    active: {
      true: {
        selectors: {
          '&::before': {
            display: 'block',
            height: toRem(24),
          },
          '&:hover::before': {
            width: toRem(3 + PUSH_X),
          },
        },
      },
    },
  },
});

export type SidebarAvatarBoxVariants = RecipeVariants<typeof SidebarAvatarBox>;

export const SidebarBadgeBox = recipe({
  base: [
    DefaultReset,
    {
      position: 'absolute',
      zIndex: 1,
    },
  ],
  variants: {
    hasCount: {
      true: {
        top: toRem(-6),
        right: toRem(-6),
      },
      false: {
        top: toRem(-2),
        right: toRem(-2),
      },
    },
  },
  defaultVariants: {
    hasCount: false,
  },
});

export type SidebarBadgeBoxVariants = RecipeVariants<typeof SidebarBadgeBox>;

export const SidebarBadgeOutline = style({
  boxShadow: `0 0 0 ${config.borderWidth.B500} ${color.Background.Container}`,
});
