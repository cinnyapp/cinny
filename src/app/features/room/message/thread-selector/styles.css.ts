import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';
import { ContainerColor } from '../../../../styles/ContainerColor.css';

export const ThreadSelectorContainer = style({
  marginTop: config.space.S200,
});

export const ThreadSelector = style([
  ContainerColor({ variant: 'SurfaceVariant' }),
  {
    padding: config.space.S200,
    borderRadius: config.radii.R400,
    cursor: 'pointer',

    selectors: {
      '&:hover, &:focus-visible': {
        backgroundColor: color.SurfaceVariant.ContainerHover,
      },
      '&:active': {
        backgroundColor: color.SurfaceVariant.ContainerActive,
      },
    },
  },
]);

export const ThreadSectorOutlined = style({
  borderWidth: config.borderWidth.B300,
});

export const ThreadSelectorDivider = style({
  height: toRem(16),
});

export const ThreadRepliesCount = style({
  color: color.Primary.Main,
});
