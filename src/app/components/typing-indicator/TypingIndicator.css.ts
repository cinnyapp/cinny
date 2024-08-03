import { keyframes } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, toRem } from 'folds';

const TypingDotAnime = keyframes({
  to: {
    opacity: '0.4',
    transform: 'translateY(-15%)',
  },
});

export const TypingDot = recipe({
  base: [
    DefaultReset,
    {
      display: 'inline-block',
      backgroundColor: 'currentColor',
      borderRadius: '50%',
      transform: 'translateY(15%)',
    },
  ],
  variants: {
    animated: {
      true: {
        animation: `${TypingDotAnime} 0.6s infinite alternate`,
      },
    },
    size: {
      '300': {
        width: toRem(4),
        height: toRem(4),
      },
      '400': {
        width: toRem(8),
        height: toRem(8),
      },
    },
    index: {
      '0': {
        animationDelay: '0s',
      },
      '1': {
        animationDelay: '0.2s',
      },
      '2': {
        animationDelay: '0.4s',
      },
    },
  },
  defaultVariants: {
    size: '400',
    animated: true,
  },
});
