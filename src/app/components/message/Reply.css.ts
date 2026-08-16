import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ReplyBar = style({
  position: 'relative',
  top: toRem(8),
  marginLeft: 'auto',

  width: toRem(19),
  height: `calc(100% - ${toRem(4)})`,

  borderLeft: `${config.borderWidth.B500} solid ${color.Surface.ContainerLine}`,
  borderTop: `${config.borderWidth.B500} solid ${color.Surface.ContainerLine}`,
  borderTopLeftRadius: config.radii.R400,
});
