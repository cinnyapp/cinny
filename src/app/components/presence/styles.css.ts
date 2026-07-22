import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const AvatarPresence = style({
  display: 'flex',
  position: 'relative',
  flexShrink: 0,
});

export const AvatarPresenceBadge = style({
  position: 'absolute',
  bottom: 0,
  right: 0,
  transform: 'translate(25%, 25%)',
  zIndex: 1,

  display: 'flex',
  padding: '5%',
  backgroundColor: 'inherit',
  borderRadius: config.radii.Pill,
  overflow: 'hidden',
});
