import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const CompactMessage = style({
  padding: `${config.space.S100} ${config.space.S400}`,
});
