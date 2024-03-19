import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const SequenceCard = style({
  selectors: {
    '&:first-child': {
      borderTopLeftRadius: config.radii.R400,
      borderTopRightRadius: config.radii.R400,
    },
    '&:last-child': {
      borderBottomLeftRadius: config.radii.R400,
      borderBottomRightRadius: config.radii.R400,
    },
  },
});
