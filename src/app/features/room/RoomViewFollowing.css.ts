import { style } from '@vanilla-extract/css';
import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const RoomViewFollowingPlaceholder = style([
  DefaultReset,
  {
    height: toRem(28),
  },
]);

export const RoomViewFollowing = recipe({
  base: [
    DefaultReset,
    {
      minHeight: toRem(28),
      padding: `0 ${config.space.S400}`,
      width: '100%',
      outline: 'none',
    },
  ],
  variants: {
    clickable: {
      true: {
        cursor: 'pointer',
        selectors: {
          '&:hover, &:focus-visible': {
            color: color.Primary.Main,
          },
          '&:active': {
            color: color.Primary.Main,
          },
        },
      },
    },
  },
});
