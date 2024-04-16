import { style } from '@vanilla-extract/css';
import { config } from 'folds';

export const ModalFlex = style({
  display: 'flex',
  flexDirection: 'column',
});
export const ModalHeader = style({
  padding: `0 ${config.space.S200} 0 ${config.space.S400}`,
  borderBottomWidth: config.borderWidth.B300,
});
export const ModalScroll = style({
  flexGrow: 1,
});
export const ModalContent = style({
  padding: config.space.S400,
  paddingRight: config.space.S200,
  paddingBottom: config.space.S700,
});
export const ModalTopic = style({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});
