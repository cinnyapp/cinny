import { keyframes, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const UserHeader = style({
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  zIndex: 1,
  padding: config.space.S200,
});

export const UserHero = style({
  position: 'relative',
});

export const UserHeroCoverContainer = style({
  height: toRem(113),
  overflow: 'hidden',
});
export const UserHeroCover = style({
  height: '100%',
  width: '100%',
  objectFit: 'cover',
});
export const UserHeroCoverBlurred = style({
  filter: 'blur(16px)',
  transform: 'scale(2)',
});

export const UserHeroAvatarContainer = style({
  position: 'relative',
  height: toRem(29),
});
export const UserAvatarContainer = style({
  position: 'absolute',
  left: config.space.S400,
  top: 0,
  transform: 'translateY(-50%)',
  // backgroundcolor for transparent image
  backgroundColor: color.Surface.Container,
  borderRadius: config.radii.R400,
});
export const UserHeroAvatar = style({
  outline: `${config.borderWidth.B600} solid ${color.Surface.Container}`,
  selectors: {
    'button&': {
      cursor: 'pointer',
    },
  },
});
export const UserHeroAvatarImg = style({
  selectors: {
    [`button${UserHeroAvatar}:hover &`]: {
      filter: 'brightness(0.5)',
    },
  },
});

const StatusAnime = keyframes({
  '0%': {
    transform: 'translateY(2px)',
  },
  '100%': {
    transform: 'translateY(0)',
  },
});

export const UserHeroStatus = style({
  position: 'absolute',
  left: toRem(78),
  bottom: toRem(58),
  marginRight: config.space.S400,

  animation: `${StatusAnime} 100ms`,

  selectors: {
    '&::before, &::after': {
      content: '',
      position: 'absolute',
      left: toRem(5),
      bottom: toRem(-4),

      width: toRem(10),
      height: toRem(10),

      background: color.Surface.Container,
      borderRadius: 999,
      transform: 'rotate(45deg)',
    },
    '&::after': {
      left: toRem(5),
      bottom: toRem(-10),

      width: toRem(5),
      height: toRem(5),
    },
  },
});

export const UserHeroStatusContent = style({
  position: 'relative',
  zIndex: 1,
  padding: `${config.space.S100} ${config.space.S200}`,
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R500,
});

export const UserActionButton = style({
  position: 'absolute',
  right: config.space.S400,
  zIndex: 1,
  transform: 'translateY(-10%)',
  outline: `${config.borderWidth.B600} solid ${color.Surface.Container}`,
});
