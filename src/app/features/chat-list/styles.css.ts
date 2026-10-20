import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const Toolbar = style({
  padding: `${config.space.S100} ${config.space.S200} ${config.space.S200}`,
  flexShrink: 0,
});

export const ChipRow = style({
  display: 'flex',
  gap: config.space.S100,
  overflowX: 'auto',
  scrollbarWidth: 'none',
  paddingBottom: toRem(2),
  selectors: {
    '&::-webkit-scrollbar': { display: 'none' },
  },
});

export const FilterChip = style({
  flexShrink: 0,
});

export const DimmedRow = style({
  opacity: 0.55,
});
