import { createVar } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { color, config } from 'folds';

const outlinedWidth = createVar('0');
export const SequenceCard = recipe({
  base: {
    border: `${outlinedWidth} solid ${color.Surface.ContainerLine}`,
    borderBottomWidth: 0,
    selectors: {
      '&:first-child': {
        borderTopLeftRadius: config.radii.R400,
        borderTopRightRadius: config.radii.R400,
      },
      '&:last-child': {
        borderBottomLeftRadius: config.radii.R400,
        borderBottomRightRadius: config.radii.R400,
        borderBottomWidth: outlinedWidth,
      },
    },
  },
  variants: {
    outlined: {
      true: {
        vars: {
          [outlinedWidth]: config.borderWidth.B300,
        },
      },
    },
  },
});
export type SequenceCardVariants = RecipeVariants<typeof SequenceCard>;
