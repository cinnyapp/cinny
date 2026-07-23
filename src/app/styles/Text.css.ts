import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const BreakWord = style({
  wordBreak: 'break-word',
});

export const PreWrap = style({
  whiteSpace: 'pre-wrap',
});

export const LineClamp2 = style({
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const LineClamp3 = style({
  display: '-webkit-box',
  WebkitLineClamp: 3,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
});

export const HoverUnderline = style({
  ':hover': {
    textDecoration: 'underline',
  },
});

export const DotDivider = style({
  display: 'inline-flex',
  flexShrink: 0,
  width: toRem(3),
  height: toRem(3),
  backgroundColor: 'currentcolor',
  opacity: config.opacity.P300,
  borderRadius: '999px',
});
