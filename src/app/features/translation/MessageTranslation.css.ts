import { style } from '@vanilla-extract/css';
import { DefaultReset, color, config, toRem } from 'folds';

// The translated-text block shown UNDER a message body.
export const TranslationBox = style([
  DefaultReset,
  {
    marginTop: config.space.S100,
    padding: config.space.S200,
    borderRadius: config.radii.R300,
    backgroundColor: color.SurfaceVariant.Container,
    color: color.SurfaceVariant.OnContainer,
    borderLeft: `${toRem(2)} solid ${color.Primary.Main}`,
    maxWidth: '100%',
  },
]);

export const TranslationHeader = style({
  opacity: 0.75,
  marginBottom: config.space.S100,
});

export const TranslationText = style({
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
});

// The inline "Translate" affordance rendered under a message (small, unobtrusive).
export const TranslateTrigger = style([
  DefaultReset,
  {
    display: 'inline-flex',
    alignItems: 'center',
    gap: config.space.S100,
    marginTop: config.space.S100,
    cursor: 'pointer',
    color: color.Surface.OnContainer,
    opacity: 0.6,
    selectors: {
      '&:hover': { opacity: 1 },
    },
  },
]);

export const LangMenu = style({
  padding: config.space.S100,
  maxHeight: toRem(280),
  overflowY: 'auto',
});
