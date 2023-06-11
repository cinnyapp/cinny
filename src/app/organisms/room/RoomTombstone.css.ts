import { style } from '@vanilla-extract/css';
import { color, config } from 'folds';

export const RoomTombstone = style({
  padding: config.space.S200,
  paddingLeft: config.space.S400,
  backgroundColor: color.SurfaceVariant.Container,
  color: color.SurfaceVariant.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
  borderRadius: config.radii.R400,
  overflow: 'hidden',
});
