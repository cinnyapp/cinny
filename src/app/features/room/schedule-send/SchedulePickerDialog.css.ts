import { style } from '@vanilla-extract/css';
import { config, toRem } from 'folds';

export const SchedulePickerContent = style({
  padding: config.space.S400,
  minWidth: toRem(300),
});

export const SplitSendButton = style({
  borderRadius: `${config.radii.R300} 0 0 ${config.radii.R300}`,
});

export const SplitChevronButton = style({
  borderRadius: `0 ${config.radii.R300} ${config.radii.R300} 0`,
  borderLeft: '1px solid currentColor',
  opacity: 0.7,
  paddingInline: toRem(2),
});
