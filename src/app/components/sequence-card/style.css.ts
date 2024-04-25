import { createVar } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { config } from 'folds';

const outlinedWidth = createVar('0');
export const SequenceCard = recipe({
  base: {
    vars: {
      [outlinedWidth]: '0',
    },
    borderStyle: 'solid',
    borderWidth: outlinedWidth,
    borderBottomWidth: 0,
    selectors: {
      '&:first-child, :not(&) + &': {
        borderTopLeftRadius: config.radii.R400,
        borderTopRightRadius: config.radii.R400,
      },
      '&:last-child, &:not(:has(+&))': {
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
