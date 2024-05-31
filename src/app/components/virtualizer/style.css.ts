import { style } from '@vanilla-extract/css';
import { DefaultReset } from 'folds';

export const VirtualTile = style([
  DefaultReset,
  {
    position: 'absolute',
    width: '100%',
    left: 0,
  },
]);
