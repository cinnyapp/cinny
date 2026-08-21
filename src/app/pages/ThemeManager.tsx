import React, { ReactNode, useEffect } from 'react';
import { configClass, varsClass } from 'folds';
import {
  DarkTheme,
  LightTheme,
  ThemeContextProvider,
  ThemeKind,
  useActiveTheme,
  useSystemThemeKind,
} from '../hooks/useTheme';
import { useSetting } from '../state/hooks/settings';
import { ContainerColor } from '../styles/ContainerColor.css';

export const useUnauthThemeManager = () => {
  const systemThemeKind = useSystemThemeKind();

  useEffect(() => {
    document.documentElement.className = '';
    document.documentElement.classList.add(
      configClass,
      varsClass,
      ...ContainerColor({ variant: 'Background' }).split(' ')
    );
    if (systemThemeKind === ThemeKind.Dark) {
      document.documentElement.classList.add(...DarkTheme.classNames);
    }
    if (systemThemeKind === ThemeKind.Light) {
      document.documentElement.classList.add(...LightTheme.classNames);
    }
  }, [systemThemeKind]);
};

export function AuthRouteThemeManager({ children }: { children: ReactNode }) {
  const activeTheme = useActiveTheme();
  const [monochromeMode] = useSetting('monochromeMode');

  useEffect(() => {
    document.documentElement.className = '';
    document.documentElement.classList.add(
      configClass,
      varsClass,
      ...ContainerColor({ variant: 'Background' }).split(' ')
    );

    document.documentElement.classList.add(...activeTheme.classNames);

    if (monochromeMode) {
      document.documentElement.style.filter = 'grayscale(1)';
    } else {
      document.documentElement.style.filter = '';
    }
  }, [activeTheme, monochromeMode]);

  return <ThemeContextProvider value={activeTheme}>{children}</ThemeContextProvider>;
}
