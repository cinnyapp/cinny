import { keyframes, style } from '@vanilla-extract/css';
import { color, toRem } from 'folds';

const wobble = keyframes({
  '0%': {
    transform: 'translateX(0) rotateZ(0deg)',
  },
  '20%': {
    transform: `translateX(-${toRem(4)}) rotateZ(-4deg)`,
  },
  '40%': {
    transform: `translateX(${toRem(4)}) rotateZ(4deg)`,
  },
  '60%': {
    transform: `translateX(-${toRem(3)}) rotateZ(-3deg)`,
  },
  '80%': {
    transform: `translateX(${toRem(3)}) rotateZ(3deg)`,
  },
  '100%': {
    transform: 'translateX(0) rotateZ(0deg)',
  },
});

const glowPulse = keyframes({
  '0%': {
    boxShadow: `0 0 0 ${toRem(0)} ${color.Success.ContainerActive}`,
  },
  '100%': {
    boxShadow: `0 0 0 ${toRem(8)} ${color.Success.ContainerActive}`,
  },
});

export const WobbleAnimation = style({
  animation: `${wobble} 2000ms ease-in-out`,
  animationIterationCount: 'infinite',
});

export const GlowAnimation = style({
  animation: `${glowPulse} 2000ms ease-out`,
  animationIterationCount: 'infinite',
});

export const CallAvatarAnimation = style({
  animation: `${wobble} 2000ms ease-in-out, ${glowPulse} 2000ms ease-out`,
  animationIterationCount: 'infinite',
});
