import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const RoomViewFollowing = style([
  DefaultReset,
  {
    minHeight: toRem(28),
    padding: `0 ${config.space.S400}`,
    width: '100%',
    backgroundColor: color.Surface.Container,
    color: color.Surface.OnContainer,
  },
]);
