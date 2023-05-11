import { style } from '@vanilla-extract/css';
import { DefaultReset, FocusOutline, color, config, toRem } from 'folds';

export const Base = style({
  width: toRem(420),
  height: toRem(450),
  backgroundColor: color.Surface.Container,
  color: color.Surface.OnContainer,
  border: `${config.borderWidth.B300} solid ${color.Surface.ContainerLine}`,
  borderRadius: config.radii.R400,
  boxShadow: config.shadow.E200,
});

export const Sidebar = style({
  width: toRem(48),
  padding: `${config.space.S200} 0`,
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
});

export const SidebarDivider = style({
  width: toRem(18),
});

export const Header = style({
  padding: config.space.S400,
});

export const Footer = style({
  padding: `${config.space.S300} ${config.space.S400}`,
});

export const EmojiGroup = style({
  padding: `${config.space.S200} 0`,
});

export const EmojiGroupLabel = style({
  position: 'sticky',
  top: 0,
  zIndex: 1,
  padding: `${config.space.S200} ${config.space.S400}`,
  backgroundColor: color.Surface.Container,
});

export const EmojiGroupContent = style([
  DefaultReset,
  {
    padding: `0 ${config.space.S200}`,
  },
]);

export const EmojiPreview = style([
  DefaultReset,
  {
    width: toRem(36),
    height: toRem(36),
    fontSize: toRem(36),
    lineHeight: toRem(36),
  },
]);

export const EmojiItem = style([
  DefaultReset,
  FocusOutline,
  {
    width: toRem(48),
    height: toRem(48),
    fontSize: toRem(32),
    lineHeight: toRem(32),
    borderRadius: config.radii.R400,
    cursor: 'pointer',

    ':hover': {
      backgroundColor: color.Surface.ContainerHover,
    },
  },
]);

export const CustomEmojiImg = style([
  DefaultReset,
  {
    width: toRem(32),
    height: toRem(32),
  },
]);
