import { style } from '@vanilla-extract/css';
import { color, config, DefaultReset } from 'folds';

const MarginBottom = style({
  marginBottom: config.space.S200,
  selectors: {
    '&:last-child': {
      marginBottom: 0,
    },
  },
});

export const Paragraph = style([MarginBottom]);

export const Heading = style([MarginBottom]);

export const BlockQuote = style([
  DefaultReset,
  MarginBottom,
  {
    paddingLeft: config.space.S200,
    borderLeft: `${config.borderWidth.B700} solid ${color.SurfaceVariant.ContainerLine}`,
    fontStyle: 'italic',
  },
]);

const BaseCode = style({
  fontFamily: 'monospace',
  color: color.Warning.OnContainer,
  background: color.Warning.Container,
  border: `${config.borderWidth.B300} solid ${color.Warning.ContainerLine}`,
  borderRadius: config.radii.R300,
});

export const Code = style([
  DefaultReset,
  BaseCode,
  {
    padding: `0 ${config.space.S100}`,
  },
]);

export const CodeBlock = style([DefaultReset, BaseCode, MarginBottom]);
export const CodeBlockInternal = style({
  padding: `${config.space.S200} ${config.space.S200} 0`,
});

export const List = style([
  DefaultReset,
  MarginBottom,
  {
    padding: `0 ${config.space.S100}`,
    paddingLeft: config.space.S600,
  },
]);
