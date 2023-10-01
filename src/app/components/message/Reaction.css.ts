import { createVar, style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, color, config, toRem } from 'folds';

const Container = createVar();
const ContainerHover = createVar();
const ContainerActive = createVar();
const ContainerLine = createVar();
const OnContainer = createVar();

export const Reaction = style([
  FocusOutline,
  {
    vars: {
      [Container]: color.SurfaceVariant.Container,
      [ContainerHover]: color.SurfaceVariant.ContainerHover,
      [ContainerActive]: color.SurfaceVariant.ContainerActive,
      [ContainerLine]: color.SurfaceVariant.ContainerLine,
      [OnContainer]: color.SurfaceVariant.OnContainer,
    },
    padding: `${toRem(2)} ${config.space.S200} ${toRem(2)} ${config.space.S100}`,
    backgroundColor: Container,
    border: `${config.borderWidth.B300} solid ${ContainerLine}`,
    borderRadius: config.radii.R300,

    selectors: {
      'button&': {
        cursor: 'pointer',
      },
      '&[aria-pressed=true]': {
        vars: {
          [Container]: color.Primary.Container,
          [ContainerHover]: color.Primary.ContainerHover,
          [ContainerActive]: color.Primary.ContainerActive,
          [ContainerLine]: color.Primary.ContainerLine,
          [OnContainer]: color.Primary.OnContainer,
        },
        backgroundColor: Container,
      },
      '&[aria-selected=true]': {
        borderColor: color.Secondary.Main,
        borderWidth: config.borderWidth.B400,
      },
      '&:hover, &:focus-visible': {
        backgroundColor: ContainerHover,
      },
      '&:active': {
        backgroundColor: ContainerActive,
      },
      '&[aria-disabled=true], &:disabled': {
        cursor: 'not-allowed',
      },
    },
  },
]);

export const ReactionText = style([
  DefaultReset,
  {
    minWidth: 0,
    maxWidth: toRem(150),
    display: 'inline-flex',
    alignItems: 'center',
    lineHeight: toRem(20),
  },
]);

export const ReactionImg = style([
  DefaultReset,
  {
    height: '1em',
    minWidth: 0,
    maxWidth: toRem(150),
    objectFit: 'contain',
  },
]);
