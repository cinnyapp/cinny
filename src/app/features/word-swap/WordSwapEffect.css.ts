import { globalStyle, keyframes, style } from '@vanilla-extract/css';
import { HIGHLIGHT_BG, HIGHLIGHT_FG } from './wordSwap';

export const EFFECT_MS = 2400;

const Shake = keyframes({
  '0%, 100%': { transform: 'translate(0, 0) rotate(0)' },
  '15%': { transform: 'translate(-10px, 4px) rotate(-1deg)' },
  '30%': { transform: 'translate(9px, -5px) rotate(1deg)' },
  '45%': { transform: 'translate(-7px, 2px) rotate(-0.5deg)' },
  '60%': { transform: 'translate(6px, 3px) rotate(0.5deg)' },
  '75%': { transform: 'translate(-3px, -2px)' },
});

const Flash = keyframes({
  '0%': { opacity: 0 },
  '10%': { opacity: 0.35 },
  '100%': { opacity: 0 },
});

const Stamp = keyframes({
  '0%': { transform: 'translate(-50%, -50%) scale(4) rotate(-20deg)', opacity: 0 },
  '15%': { transform: 'translate(-50%, -50%) scale(0.9) rotate(-8deg)', opacity: 1 },
  '22%': { transform: 'translate(-50%, -50%) scale(1.05) rotate(-8deg)' },
  '80%': { transform: 'translate(-50%, -50%) scale(1) rotate(-8deg)', opacity: 1 },
  '100%': { transform: 'translate(-50%, -50%) scale(1.3) rotate(-8deg)', opacity: 0 },
});

const Fall = keyframes({
  '0%': { transform: 'translateY(-10vh) rotate(0)', opacity: 1 },
  '85%': { opacity: 1 },
  '100%': { transform: 'translateY(110vh) rotate(540deg)', opacity: 0 },
});

// Added to <body> while the effect plays.
export const Shaking = style({});
globalStyle(`body.${Shaking} #root`, {
  animation: `${Shake} 600ms ease-in-out 2`,
});

export const Overlay = style({
  position: 'fixed',
  inset: 0,
  zIndex: 10000,
  pointerEvents: 'none',
  overflow: 'hidden',
});

export const FlashLayer = style({
  position: 'absolute',
  inset: 0,
  background: HIGHLIGHT_BG,
  animation: `${Flash} 700ms ease-out forwards`,
});

export const StampWord = style({
  position: 'absolute',
  top: '45%',
  left: '50%',
  padding: '0.1em 0.4em',
  fontSize: 'clamp(3rem, 14vw, 9rem)',
  fontWeight: 900,
  textTransform: 'uppercase',
  whiteSpace: 'nowrap',
  color: HIGHLIGHT_FG,
  background: HIGHLIGHT_BG,
  border: `0.08em solid ${HIGHLIGHT_FG}`,
  borderRadius: '0.15em',
  boxShadow: '0 0.1em 0.4em rgba(0, 0, 0, 0.4)',
  animation: `${Stamp} ${EFFECT_MS}ms cubic-bezier(0.2, 0.9, 0.3, 1.2) forwards`,
});

export const Drop = style({
  position: 'absolute',
  top: 0,
  fontSize: '2.2rem',
  animationName: Fall,
  animationTimingFunction: 'ease-in',
  animationFillMode: 'forwards',
});

globalStyle(`${Overlay} *`, {
  '@media': {
    '(prefers-reduced-motion: reduce)': { animationDuration: '1ms', animationIterationCount: 1 },
  },
});
globalStyle(`body.${Shaking} #root`, {
  '@media': { '(prefers-reduced-motion: reduce)': { animation: 'none' } },
});
