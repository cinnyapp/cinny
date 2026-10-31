import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const PinBanner = style({
  padding: `${config.space.S100} ${config.space.S200}`,
  borderBottom: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  backgroundColor: color.Surface.Container,
  gap: config.space.S200,
});

export const PinBannerBody = style({
  minWidth: 0,
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  gap: config.space.S200,
  cursor: 'pointer',
  selectors: {
    '&:hover': {
      backgroundColor: color.Surface.ContainerHover,
    },
    '&:focus-visible': {
      outline: `${config.borderWidth.B600} solid ${color.Secondary.Main}`,
      outlineOffset: toRem(1),
    },
  },
});

export const PinBannerText = style({
  minWidth: 0,
});
