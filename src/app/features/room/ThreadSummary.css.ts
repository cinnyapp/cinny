import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const ThreadSummary = style({
  display: 'flex',
  alignItems: 'center',
  gap: toRem(8),
  width: 'fit-content',
  maxWidth: '100%',
  marginLeft: toRem(64),
  padding: `${config.space.S100} ${config.space.S200}`,
  border: 'none',
  borderRadius: toRem(12),
  background: 'transparent',
  color: color.Surface.OnContainer,
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.15s ease, color 0.15s ease',
  ':hover': {
    background: color.Surface.Container,
    color: color.SurfaceVariant.OnContainer,
  },
  ':focus-visible': {
    outline: 'none',
    background: color.Surface.Container,
  },
});

export const ThreadSummaryUnread = style({
  color: color.Success.Main,
  ':hover': {
    color: color.Success.Main,
    background: color.Surface.Container,
  },
});
