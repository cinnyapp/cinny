import { style } from '@vanilla-extract/css';
import { config, color, toRem } from 'folds';

export const VoiceRoomContainer = style({
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
  backgroundColor: 'var(--mx-surface)',
});

export const VoiceRoomHeader = style({
  display: 'flex',
  alignItems: 'center',
  padding: `${config.space.S300} ${config.space.S400}`,
  borderBottom: `${config.borderWidth.B300} solid var(--mx-surface-border)`,
  gap: config.space.S200,
  minHeight: toRem(56),
});

export const VoiceRoomContent = style({
  display: 'flex',
  flexGrow: 1,
  overflow: 'hidden',
});

export const VideoGrid = style({
  display: 'flex',
  flexWrap: 'wrap',
  gap: config.space.S200,
  padding: config.space.S300,
  alignContent: 'flex-start',
  justifyContent: 'center',
  overflow: 'auto',
  flexGrow: 1,
});

export const VideoTile = style({
  position: 'relative',
  borderRadius: config.radii.R400,
  overflow: 'hidden',
  backgroundColor: 'var(--mx-bg-surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: toRem(160),
  minHeight: toRem(120),
  flex: '1 1 auto',
  maxWidth: toRem(400),
  maxHeight: toRem(300),
});

export const VideoTileVideo = style({
  width: '100%',
  height: '100%',
  objectFit: 'cover',
});

export const VideoTileOverlay = style({
  position: 'absolute',
  bottom: 0,
  left: 0,
  right: 0,
  padding: `${config.space.S100} ${config.space.S200}`,
  background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S100,
});

export const AudioOnlyParticipants = style({
  display: 'flex',
  flexDirection: 'column',
  width: toRem(200),
  borderLeft: `${config.borderWidth.B300} solid var(--mx-surface-border)`,
  overflow: 'auto',
  padding: config.space.S200,
  gap: config.space.S100,
  flexShrink: 0,
});

export const AudioParticipantItem = style({
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  padding: `${config.space.S100} ${config.space.S200}`,
  borderRadius: config.radii.R300,
  ':hover': {
    backgroundColor: 'var(--mx-surface-hover)',
  },
});

export const ControlsBar = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: config.space.S200,
  padding: `${config.space.S300} ${config.space.S400}`,
  borderTop: `${config.borderWidth.B300} solid var(--mx-surface-border)`,
  minHeight: toRem(72),
});

export const ControlButton = style({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: toRem(44),
  height: toRem(44),
  borderRadius: '50%',
  border: 'none',
  cursor: 'pointer',
  transition: 'background-color 0.15s ease',
  backgroundColor: 'var(--mx-surface-hover)',
  color: 'var(--mx-on-surface)',
  ':hover': {
    backgroundColor: 'var(--mx-surface-active)',
  },
});

export const ControlButtonActive = style({
  backgroundColor: 'var(--mx-primary)',
  color: 'var(--mx-on-primary)',
  ':hover': {
    backgroundColor: 'var(--mx-primary-hover)',
  },
});

export const ControlButtonDanger = style({
  backgroundColor: 'var(--mx-critical)',
  color: 'var(--mx-on-critical)',
  ':hover': {
    backgroundColor: 'var(--mx-critical-hover)',
  },
});

export const JoinPrompt = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: config.space.S400,
  height: '100%',
  padding: config.space.S400,
});

export const SpeakingIndicator = style({
  position: 'absolute',
  inset: 0,
  borderRadius: config.radii.R400,
  border: `2px solid var(--mx-success)`,
  pointerEvents: 'none',
});

export const ParticipantAvatarFallback = style({
  width: toRem(48),
  height: toRem(48),
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: toRem(18),
  fontWeight: 700,
  flexShrink: 0,
});
