import { createVar } from '@vanilla-extract/css';
import { RecipeVariants, recipe } from '@vanilla-extract/recipes';
import { config } from 'folds';

const outlinedWidth = createVar('0');
const radii = createVar(config.radii.R400);
export const SequenceCard = recipe({
  base: {
    vars: {
      [outlinedWidth]: '0',
    },
    borderStyle: 'solid',
    borderWidth: outlinedWidth,

    selectors: {
      '&:first-child, :not(&) + &': {
        borderTopLeftRadius: [radii],
        borderTopRightRadius: [radii],
      },
      '&:last-child, &:not(:has(+&))': {
        borderBottomLeftRadius: [radii],
        borderBottomRightRadius: [radii],
      },
      [`&[data-first-child="true"]`]: {
        borderTopLeftRadius: [radii],
        borderTopRightRadius: [radii],
      },
      [`&[data-first-child="false"]`]: {
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
      },
      [`&[data-last-child="true"]`]: {
        borderBottomLeftRadius: [radii],
        borderBottomRightRadius: [radii],
      },
      [`&[data-last-child="false"]`]: {
        borderBottomLeftRadius: 0,
        borderBottomRightRadius: 0,
      },

      'button&': {
        cursor: 'pointer',
      },
    },
  },
  variants: {
    radii: {
      '0': {
        vars: {
          [radii]: config.radii.R0,
        },
      },
      '300': {
        vars: {
          [radii]: config.radii.R300,
        },
      },
      '400': {
        vars: {
          [radii]: config.radii.R400,
        },
      },
      '500': {
        vars: {
          [radii]: config.radii.R500,
        },
      },
    },
    outlined: {
      true: {
        vars: {
          [outlinedWidth]: config.borderWidth.B300,
        },
      },
    },
    mergeBorder: {
      true: {
        borderBottomWidth: 0,
        selectors: {
          '&:last-child, &:not(:has(+&))': {
            borderBottomWidth: outlinedWidth,
          },
        },
      },
    },
  },
  defaultVariants: {
    radii: '400',
  },
});
export type SequenceCardVariants = RecipeVariants<typeof SequenceCard>;
