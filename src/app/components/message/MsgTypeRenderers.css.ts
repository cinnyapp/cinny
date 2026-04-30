import { style, globalStyle } from '@vanilla-extract/css';
import { toRem } from 'folds';

export const MText = style({});

globalStyle(`${MText} li`, {
  minHeight: toRem(22),
});
