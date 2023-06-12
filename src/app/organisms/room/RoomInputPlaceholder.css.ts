import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const RoomInputPlaceholder = style({
  minHeight: toRem(48),
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  boxShadow: `inset 0 0 0 ${config.borderWidth.B300} ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
});
