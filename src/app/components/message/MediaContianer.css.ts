import { recipe } from '@vanilla-extract/recipes';
import { DefaultReset, color, config, toRem } from 'folds';

export const MediaContainer = recipe({
  base: [
    DefaultReset,
    {
      maxWidth: '100%',
      maxHeight: toRem(600),
      width: toRem(400),
      backgroundColor: color.SurfaceVariant.Container,
      color: color.SurfaceVariant.OnContainer,
      borderRadius: config.radii.R400,
      overflow: 'hidden',
    },
  ],
  variants: {
    outlined: {
      true: {
        border: `${config.borderWidth.B300} solid ${color.SurfaceVariant.ContainerLine}`,
      },
    },
  },
});
