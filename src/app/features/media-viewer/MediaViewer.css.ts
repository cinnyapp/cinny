import { style, globalStyle } from '@vanilla-extract/css';
import { config } from 'folds';

/*
 * The viewer is deliberately dark in both themes (like every phone gallery):
 * pictures read best on near-black, and the chrome fades out of the way.
 */
const INK = 'rgba(255, 255, 255, 0.94)';
const INK_DIM = 'rgba(255, 255, 255, 0.66)';
const GROUND = 'rgb(10, 11, 13)';
const GLASS = 'rgba(16, 18, 22, 0.72)';

export const Root = style({
  position: 'fixed',
  inset: 0,
  zIndex: 2000,
  display: 'flex',
  flexDirection: 'column',
  backgroundColor: GROUND,
  color: INK,
  userSelect: 'none',
  WebkitUserSelect: 'none',
  outline: 'none',
});

export const Bar = style({
  position: 'absolute',
  left: 0,
  right: 0,
  zIndex: 2,
  display: 'flex',
  alignItems: 'center',
  gap: config.space.S200,
  paddingLeft: `max(${config.space.S200}, env(safe-area-inset-left, 0px))`,
  paddingRight: `max(${config.space.S200}, env(safe-area-inset-right, 0px))`,
  transition: 'opacity 160ms ease, transform 160ms ease',
});

export const TopBar = style([
  Bar,
  {
    top: 0,
    paddingTop: `calc(${config.space.S200} + env(safe-area-inset-top, 0px))`,
    paddingBottom: config.space.S200,
    background: `linear-gradient(to bottom, ${GLASS}, rgba(16,18,22,0))`,
  },
]);

export const BottomBar = style([
  Bar,
  {
    bottom: 0,
    flexDirection: 'column',
    alignItems: 'stretch',
    paddingBottom: `calc(${config.space.S200} + env(safe-area-inset-bottom, 0px))`,
    paddingTop: config.space.S400,
    background: `linear-gradient(to top, ${GLASS} 60%, rgba(16,18,22,0))`,
  },
]);

export const ChromeHidden = style({
  opacity: 0,
  pointerEvents: 'none',
});

export const Title = style({
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  flexGrow: 1,
  lineHeight: 1.25,
});

export const TitleName = style({
  fontWeight: 600,
  fontSize: '0.95rem',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
});

export const TitleSub = style({
  color: INK_DIM,
  fontSize: '0.8rem',
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
});

export const Counter = style({
  fontVariantNumeric: 'tabular-nums',
  color: INK_DIM,
  fontSize: '0.85rem',
  whiteSpace: 'nowrap',
  padding: `0 ${config.space.S100}`,
});

export const ToolButton = style({
  appearance: 'none',
  border: 'none',
  background: 'transparent',
  color: INK,
  width: 40,
  height: 40,
  borderRadius: 20,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  flexShrink: 0,
  selectors: {
    '&:hover': { backgroundColor: 'rgba(255,255,255,0.12)' },
    '&:focus-visible': { outline: `2px solid ${INK}`, outlineOffset: 1 },
    '&[aria-pressed="true"]': { backgroundColor: 'rgba(255,255,255,0.2)' },
    '&:disabled': { opacity: 0.35, cursor: 'default' },
  },
});

export const Stage = style({
  position: 'absolute',
  inset: 0,
  overflow: 'hidden',
  touchAction: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
});

export const Slide = style({
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  willChange: 'transform',
});

export const Media = style({
  maxWidth: '100%',
  maxHeight: '100%',
  objectFit: 'contain',
  transformOrigin: 'center center',
  willChange: 'transform',
  WebkitUserDrag: 'none',
} as any);

export const Video = style({
  maxWidth: '100%',
  maxHeight: 'calc(100% - 180px)',
  outline: 'none',
});

export const NavButton = style({
  position: 'absolute',
  top: '50%',
  transform: 'translateY(-50%)',
  zIndex: 2,
  appearance: 'none',
  border: 'none',
  width: 44,
  height: 44,
  borderRadius: 22,
  backgroundColor: GLASS,
  color: INK,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'opacity 160ms ease',
  selectors: {
    '&:hover': { backgroundColor: 'rgba(40,44,52,0.9)' },
    '&:focus-visible': { outline: `2px solid ${INK}` },
    '&:disabled': { opacity: 0, pointerEvents: 'none' },
  },
});

export const NavPrev = style([NavButton, { left: `max(12px, env(safe-area-inset-left, 0px))` }]);
export const NavNext = style([NavButton, { right: `max(12px, env(safe-area-inset-right, 0px))` }]);

export const Placeholder = style({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: config.space.S300,
  textAlign: 'center',
  color: INK_DIM,
  maxWidth: '22rem',
  padding: config.space.S500,
  fontSize: '0.9rem',
  lineHeight: 1.45,
});

export const PlaceholderTitle = style({ color: INK, fontWeight: 600, fontSize: '1rem' });

export const Caption = style({
  color: INK,
  fontSize: '0.9rem',
  lineHeight: 1.4,
  maxHeight: '4.2em',
  overflow: 'auto',
  textAlign: 'center',
  padding: `0 ${config.space.S300}`,
  userSelect: 'text',
  WebkitUserSelect: 'text',
});

export const Banner = style({
  alignSelf: 'center',
  color: INK_DIM,
  fontSize: '0.8rem',
  textAlign: 'center',
  padding: `0 ${config.space.S300}`,
  maxWidth: '40rem',
});

export const Filmstrip = style({
  height: 64,
  overflowX: 'auto',
  overflowY: 'hidden',
  scrollbarWidth: 'none',
  position: 'relative',
  selectors: { '&::-webkit-scrollbar': { display: 'none' } },
});

export const Thumb = style({
  position: 'absolute',
  top: 4,
  width: 56,
  height: 56,
  borderRadius: 6,
  overflow: 'hidden',
  border: '2px solid transparent',
  padding: 0,
  backgroundColor: 'rgba(255,255,255,0.08)',
  color: INK_DIM,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  opacity: 0.62,
  transition: 'opacity 120ms ease, border-color 120ms ease',
  selectors: {
    '&:hover': { opacity: 0.9 },
    '&:focus-visible': { outline: `2px solid ${INK}` },
  },
});

export const ThumbRound = style({ borderRadius: 28 });

export const ThumbActive = style({ opacity: 1, borderColor: INK });

globalStyle(`${Thumb} img`, {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
});

export const ThumbBadge = style({
  position: 'absolute',
  right: 3,
  bottom: 3,
  display: 'flex',
  color: INK,
  filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
});

export const Toast = style({
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  zIndex: 3,
  backgroundColor: GLASS,
  color: INK,
  padding: `${config.space.S200} ${config.space.S400}`,
  borderRadius: 999,
  fontSize: '0.9rem',
  pointerEvents: 'none',
});

export const Spinner = style({
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  pointerEvents: 'none',
});

export const Chip = style({
  appearance: 'none',
  border: '1px solid rgba(255,255,255,0.28)',
  background: 'transparent',
  color: INK,
  borderRadius: 999,
  padding: '4px 10px',
  fontSize: '0.78rem',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  selectors: {
    '&[aria-pressed="true"]': { backgroundColor: 'rgba(255,255,255,0.18)' },
    '&:focus-visible': { outline: `2px solid ${INK}` },
  },
});

export const HideOnNarrow = style({
  '@media': { 'screen and (max-width: 520px)': { display: 'none' } },
});
