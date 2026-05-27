import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const LobbyHeroTopic = style({
  display: 'block',
  overflow: 'hidden',
  minWidth: 0,
  width: '100%',
  whiteSpace: 'normal',
  overflowWrap: 'anywhere',
  wordBreak: 'break-word',
  hyphens: 'auto',

  ':hover': {
    cursor: 'pointer',
    opacity: config.opacity.P500,
    textDecoration: 'underline',
  },
});
