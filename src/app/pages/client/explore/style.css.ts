import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const CardGrid = style({
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: config.space.S400,
});
