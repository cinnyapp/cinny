import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { recipe } from '@vanilla-extract/recipes';
import { ContainerColor } from '../../styles/ContainerColor.css';

export const SpaceItemCard = recipe({
  base: {
    paddingBottom: config.space.S100,
    borderBottom: `${config.borderWidth.B300} solid transparent`,
  },
  variants: {
    outlined: {
      true: {
        borderBottomColor: color.Surface.ContainerLine,
      },
    },
  },
});
export const HeaderChip = style({
  selectors: {
    [`&[data-ui-before="true"]`]: {
      paddingLeft: config.space.S100,
    },
  },
});
export const HeaderChipPlaceholder = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    borderRadius: config.radii.R400,
    paddingLeft: config.space.S100,
    paddingRight: config.space.S300,
    height: toRem(32),
  },
]);
