import React from 'react';
import { useSetting } from '../../state/hooks/settings';

function SystemEmojiFeature() {
  const [twitterEmoji] = useSetting('twitterEmoji');

  if (twitterEmoji) {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji');
  } else {
    document.documentElement.style.setProperty('--font-emoji', 'Twemoji_DISABLED');
  }

  return null;
}

function PageZoomFeature() {
  const [pageZoom] = useSetting('pageZoom');

  if (pageZoom === 100) {
    document.documentElement.style.removeProperty('font-size');
  } else {
    document.documentElement.style.setProperty('font-size', `calc(1em * ${pageZoom / 100})`);
  }

  return null;
}

export function ClientNonUIFeatures() {
  return (
    <>
      <SystemEmojiFeature />
      <PageZoomFeature />
    </>
  );
}
