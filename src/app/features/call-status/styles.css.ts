import { style } from '@vanilla-extract/css';
import { color, config, toRem } from 'folds';

export const LiveChipText = style({
  color: color.Critical.Main,
});

export const CallStatus = style([
  {
    padding: `${toRem(6)} ${config.space.S200}`,
    borderTop: `${config.borderWidth.B300} solid ${color.Background.ContainerLine}`,
  },
]);

export const ControlDivider = style({
  height: toRem(16),
});

export const SpeakerAvatarOutline = style({
  boxShadow: `0 0 0 ${config.borderWidth.B600} ${color.Success.Main}`,
});
