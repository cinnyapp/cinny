import { globalStyle, style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const SearchBox = style({
  padding: `0 ${config.space.S200} ${config.space.S200}`,
});

// type="search" draws its own clear button in WebKit; we render our own.
globalStyle(`${SearchBox} input::-webkit-search-cancel-button`, { display: 'none' });
globalStyle(`${SearchBox} input::-webkit-search-decoration`, { display: 'none' });

export const ResultList = style({
  display: 'flex',
  flexDirection: 'column',
  gap: config.space.S100,
});

export const ResultItem = style({
  textAlign: 'left',
});

export const Hit = style({
  color: color.Primary.Main,
  fontWeight: config.fontWeight.W600,
});

export const EmptyState = style({
  padding: config.space.S400,
  textAlign: 'center',
});

/** Applied to a setting tile that the search sent you to. */
export const TileHighlight = style({
  borderRadius: config.radii.R400,
  outline: `${toRem(2)} solid ${color.Primary.Main}`,
  outlineOffset: toRem(4),
  transition: 'outline-color 400ms ease-out',
});
