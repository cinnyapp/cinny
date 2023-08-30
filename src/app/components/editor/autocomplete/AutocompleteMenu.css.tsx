import { style } from '@vanilla-extract/css';
import { DefaultReset, config } from 'folds';

export const AutocompleteMenuBase = style([
  DefaultReset,
  {
    position: 'relative',
  },
]);

export const AutocompleteMenuContainer = style([
  DefaultReset,
  {
    position: 'absolute',
    bottom: config.space.S200,
    left: 0,
    right: 0,
    zIndex: config.zIndex.Max,
  },
]);

export const AutocompleteMenu = style([
  DefaultReset,
  {
    maxHeight: '30vh',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
]);

export const AutocompleteMenuHeader = style([
  DefaultReset,
  { padding: `0 ${config.space.S300}`, flexShrink: 0 },
]);
