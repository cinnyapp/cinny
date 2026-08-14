import { keyframes, style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';
import { ContainerColor } from '../../../styles/ContainerColor.css';

export const ThreadView = style({
  // width: toRem(456),
  width: toRem(496),
  flexShrink: 0,
  flexGrow: 0,
});

export const ThreadViewFloating = style({
  position: 'absolute',
  right: 0,
  top: 0,
  bottom: 0,
  zIndex: 1,

  maxWidth: toRem(496),
  flexShrink: 1,
  width: '100vw',
  boxShadow: config.shadow.E400,
});

export const ZigZagLine = style([
  ContainerColor({ variant: 'Background' }),
  {
    minHeight: '20px',
    overflow: 'hidden',

    mask: `50% / 20px repeat-x conic-gradient(
      from -45deg at bottom,
      #0000,
      #000 1deg 89deg,
      #0000 90deg
    )`,
  },
]);

export const rainbowUpAnime = keyframes({
  '0%': {
    height: 0,
  },
  '100%': {
    height: '100%',
  },
});

export const ZigZagRainbow = style({
  '::before': {
    content: '""',
    position: 'absolute',
    height: '100%',
    bottom: 0,
    left: 0,
    right: 0,

    background: `
      linear-gradient(
        to top,
        rgba(255, 100, 120, 0.18),
        rgba(255, 190, 120, 0.18),
        rgba(255, 255, 140, 0.18),
        rgba(120, 255, 170, 0.18),
        rgba(120, 240, 240, 0.18),
        rgba(120, 180, 255, 0.18),
        rgba(180, 140, 255, 0.18),
        rgba(255, 140, 210, 0.18),
        rgba(255, 120, 140, 0.18),
        transparent
      )
      `,

    animation: `${rainbowUpAnime} 1000ms ease-out`,
  },
});
