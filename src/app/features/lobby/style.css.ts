import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config } from 'folds';

export const AvatarPlaceholder = style({
  backgroundColor: color.Secondary.Container,
});
export const LinePlaceholder = style([
  DefaultReset,
  {
    width: '100%',
    height: config.lineHeight.T200,
    borderRadius: config.radii.R300,
    backgroundColor: color.Secondary.Container,
  },
]);
