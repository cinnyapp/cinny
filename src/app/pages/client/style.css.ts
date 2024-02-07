import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ClientDrawerLayout = style({
  width: toRem(280),
  backgroundColor: color.Background.Container,
  color: color.Background.OnContainer,
  borderColor: color.Background.ContainerLine,
});

export const ClientDrawerHeaderLayout = style({
  padding: `0 ${config.space.S300}`,
  flexShrink: 0,
  borderBottomWidth: 1,
});

export const ClientDrawerContentLayout = style({
  minHeight: '100%',
  padding: config.space.S200,
  paddingRight: 0,
  paddingBottom: config.space.S700,
});
