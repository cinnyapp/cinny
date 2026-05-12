import { globalStyle } from '@vanilla-extract/css';
import { color } from 'folds';
import { extendedColor } from './colors.css';

globalStyle('body', {
  background: extendedColor.background,
  borderColor: color.Background.ContainerLine,
  outlineColor: color.Background.ContainerLine,
  color: color.Background.OnContainer,
});
