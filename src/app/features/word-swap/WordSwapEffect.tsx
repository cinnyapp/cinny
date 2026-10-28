import React, { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { wordSwapBurstAtom } from './useWordSwaps';
import * as css from './WordSwapEffect.css';

const DROPS = ['🚨', '😂', '🤣', '💀', '🔥', '🫢', '👀'];

// Mount once: the screen shakes, flashes, stamps the word and rains emoji for a moment.
export function WordSwapEffect() {
  const [burst, setBurst] = useAtom(wordSwapBurstAtom);

  useEffect(() => {
    if (!burst) return undefined;
    document.body.classList.add(css.Shaking);
    const id = window.setTimeout(() => setBurst(undefined), css.EFFECT_MS);
    return () => {
      window.clearTimeout(id);
      document.body.classList.remove(css.Shaking);
    };
  }, [burst, setBurst]);

  const drops = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => ({
        emoji: DROPS[i % DROPS.length],
        left: Math.random() * 100,
        delay: Math.random() * 600,
        duration: 1200 + Math.random() * 900,
      })),
    // New positions for every burst.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [burst?.id]
  );

  if (!burst) return null;

  return createPortal(
    <div key={burst.id} className={css.Overlay} aria-hidden>
      <div className={css.FlashLayer} />
      {drops.map((drop, i) => (
        <span
          // eslint-disable-next-line react/no-array-index-key
          key={i}
          className={css.Drop}
          style={{
            left: `${drop.left}%`,
            animationDelay: `${drop.delay}ms`,
            animationDuration: `${drop.duration}ms`,
          }}
        >
          {drop.emoji}
        </span>
      ))}
      <div className={css.StampWord}>{burst.word}</div>
    </div>,
    document.body
  );
}
