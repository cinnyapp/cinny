import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  padding: config.space.S400,
  paddingBottom: config.space.S400,
  position: 'relative',
  '@media': {
    'screen and (max-width: 768px)': {
      padding: config.space.S300,
      paddingBottom: config.space.S300,
    },
  },
});

export const AuthCard = style({
  maxWidth: toRem(460),
  width: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E100,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
  '@media': {
    'screen and (max-width: 768px)': {
      borderRadius: config.radii.R300,
      maxWidth: '100%',
    },
  },
});

export const AuthLogo = style([
  DefaultReset,
  {
    width: toRem(26),
    height: toRem(26),

    borderRadius: '50%',
  },
]);

export const AuthHeader = style({
  padding: `0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
});

export const AuthCardContent = style({
  maxWidth: toRem(402),
  width: '100%',
  margin: 'auto',
  padding: config.space.S400,
  paddingTop: config.space.S700,
  paddingBottom: toRem(44),
  gap: toRem(44),
  '@media': {
    'screen and (max-width: 768px)': {
      padding: config.space.S300,
      paddingTop: config.space.S500,
      paddingBottom: config.space.S500,
      gap: config.space.S500,
    },
  },
});

export const AuthFooter = style({
  padding: config.space.S200,
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
});
