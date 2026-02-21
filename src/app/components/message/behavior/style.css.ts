import { style } from '@vanilla-extract/css';

export const container = style({
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
});

export const iconContainer = style({
  position: 'absolute',
  top: 0,
  bottom: 0,
  right: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '150px',
});

export const messageContent = style({
  position: 'relative',
  touchAction: 'pan-y',
  backgroundColor: 'var(--folds-color-Background-Main)',
  width: '100%',
});

export const icon = style({
  position: 'absolute',
});
