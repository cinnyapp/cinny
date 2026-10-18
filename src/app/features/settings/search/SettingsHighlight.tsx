import React, { ReactNode, createContext, useContext, useEffect, useRef, useState } from 'react';

type HighlightState = {
  /** Exact title of the setting the search sent the user to. */
  title?: string;
  /** Bumped on every jump, so re-selecting the same setting re-flashes it. */
  token: number;
};

const SettingsHighlightContext = createContext<HighlightState>({ token: 0 });

type SettingsHighlightProviderProps = {
  value: HighlightState;
  children: ReactNode;
};
export function SettingsHighlightProvider({ value, children }: SettingsHighlightProviderProps) {
  return (
    <SettingsHighlightContext.Provider value={value}>{children}</SettingsHighlightContext.Provider>
  );
}

/**
 * Used by SettingTile: when the Settings search jumped to this exact setting,
 * scroll it into view and flash an outline around it for a moment.
 *
 * Outside the Settings page the context is the default and this is a no-op.
 */
export const useSettingHighlight = (title: ReactNode) => {
  const { title: target, token } = useContext(SettingsHighlightContext);
  const ref = useRef<HTMLDivElement>(null);
  const [highlighted, setHighlighted] = useState(false);

  const isTarget = typeof title === 'string' && !!target && title === target;

  useEffect(() => {
    if (!isTarget) {
      setHighlighted(false);
      return undefined;
    }
    setHighlighted(true);
    const scroll = window.setTimeout(() => {
      ref.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 60);
    const clear = window.setTimeout(() => setHighlighted(false), 2600);
    return () => {
      window.clearTimeout(scroll);
      window.clearTimeout(clear);
    };
  }, [isTarget, token]);

  return { ref, highlighted };
};
