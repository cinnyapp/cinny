import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const Header = style({
  borderBottomColor: 'transparent',
});
export const HeaderTopic = style({
  ':hover': {
    cursor: 'pointer',
    opacity: config.opacity.P500,
    textDecoration: 'underline',
  },
});
