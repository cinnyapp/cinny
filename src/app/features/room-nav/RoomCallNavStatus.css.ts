import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const Actions = style({
  padding: config.space.S200,
});

export const VoiceAppear = style({
  opacity: 0,
  maxHeight: 0,
  overflow: 'hidden',
  transform: 'translateY(12px)',
  transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',

  selectors: {
    '&.active': {
      opacity: 1,
      maxHeight: '200px',
      transform: 'translateY(0)',
    },
  },
});

export const RoomButton = style({
  width: '100%',
  minWidth: 0,
  padding: `0 ${config.space.S200}`,
  justifyContent: 'space-between',
});

export const VoiceControls = style({
  paddingBottom: 15,
  justifyContent: 'center',
});

export const RoomName = style({
  flexGrow: 1,
  minWidth: 0,
});
