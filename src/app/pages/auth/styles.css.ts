import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

export const AuthLayout = style({
  minHeight: '100%',
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: 0,
  position: 'relative',
});

export const AuthCard = style({
  marginTop: '6vh',
  maxWidth: config.size.ModalWidth300,
  width: '100%',
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E100,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  overflow: 'hidden',
});

export const AuthLogo = style([
  DefaultReset,
  {
    position: 'absolute',
    transform: 'translateY(-50%)',
    border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
    borderRadius: '50%',

    width: toRem(64),
    height: toRem(64),
  },
]);

export const AuthHeader = style({
  padding: `0 ${config.space.S400}`,
  paddingTop: toRem(40),
});

export const AuthCardContent = style({
  padding: toRem(44),
  gap: toRem(44),
});

export const AuthFooter = style({
  padding: config.space.S200,
});
