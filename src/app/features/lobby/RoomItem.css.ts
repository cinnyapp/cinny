import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const RoomItemCard = style({
  padding: config.space.S400,
  borderRadius: 0,
});
export const RoomProfileTopic = style({
  cursor: 'pointer',
  ':hover': {
    textDecoration: 'underline',
  },
});
export const ErrorNameContainer = style({
  gap: toRem(2),
});
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
