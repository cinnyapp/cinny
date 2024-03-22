import { keyframes, style } from '@vanilla-extract/css';
import { config } from 'folds';

const ScrollContainerAnime = keyframes({
  '0%': {
    transform: `translate(-50%, -100%) scale(0)`,
  },
  '100%': {
    transform: `translate(-50%, 0) scale(1)`,
  },
});

export const ScrollTopContainer = style({
  position: 'absolute',
  top: config.space.S200,
  left: '50%',
  transform: 'translateX(-50%)',
  zIndex: config.zIndex.Z100,
  animation: `${ScrollContainerAnime} 100ms`,
});
