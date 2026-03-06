import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const ScheduledMessagesToggle = style({
  padding: `${config.space.S100} ${config.space.S400}`,
});

export const ScheduledMessagesPanel = style({
  padding: `${config.space.S200} ${config.space.S400}`,
  maxHeight: toRem(200),
  overflowY: 'auto',
});

export const ScheduledMessageRow = style({
  padding: `${config.space.S200} 0`,
  borderBottomWidth: config.borderWidth.B300,
  borderBottomStyle: 'solid',
  borderBottomColor: 'currentcolor',
  opacity: 0.8,
  selectors: {
    '&:last-child': {
      borderBottom: 'none',
    },
  },
});

export const MessagePreview = style({
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: toRem(300),
});
