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
import { settingsAtom } from '../state/settings';
import { hexToGrayscale } from '../plugins/colorUtils';

export function UnAuthRouteThemeManager() {
  const systemThemeKind = useSystemThemeKind();

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(configClass, varsClass);
    if (systemThemeKind === ThemeKind.Dark) {
      document.body.classList.add(...DarkTheme.classNames);
    }
    if (systemThemeKind === ThemeKind.Light) {
      document.body.classList.add(...LightTheme.classNames);
    }
  }, [systemThemeKind]);

  return null;
}

export function AuthRouteThemeManager({ children }: { children: ReactNode }) {
  const activeTheme = useActiveTheme();
  const [monochromeMode] = useSetting(settingsAtom, 'monochromeMode');

  useEffect(() => {
    document.body.className = '';
    document.body.classList.add(configClass, varsClass);
    document.body.classList.add(...activeTheme.classNames);

    if (monochromeMode) {
      document.body.style.filter = 'grayscale(1)';
    } else {
      document.body.style.filter = '';
    }
  }, [activeTheme, monochromeMode]);

  return (
    <ThemeContextProvider value={activeTheme}>
      <CustomThemeManager />
      {children}
    </ThemeContextProvider>
  );
}

export function CustomThemeManager() {
  const [customBackgroundEnabled] = useSetting(settingsAtom, 'customBackgroundEnabled');
  const [customBgColor1] = useSetting(settingsAtom, 'customBgColor1');
  const [customBgColor2] = useSetting(settingsAtom, 'customBgColor2');
  const [customBgColor3] = useSetting(settingsAtom, 'customBgColor3');
  const [customBgColor4] = useSetting(settingsAtom, 'customBgColor4');
  const [customBgColor5] = useSetting(settingsAtom, 'customBgColor5');
  const [transparency] = useSetting(settingsAtom, 'transparency');
  const [angle] = useSetting(settingsAtom, 'angle');
  const [blur] = useSetting(settingsAtom, 'blur');

  const [monochromeMode] = useSetting(settingsAtom, 'monochromeMode');

  useEffect(() => {
    if (!customBackgroundEnabled) {
      document.body.style.setProperty('--custom-gradient', 'none');
      document.body.style.opacity = '1';
      document.body.style.backdropFilter = `blur(0px)`;
      return;
    }

    console.log("Monochrome mode:", monochromeMode);

    const colors = [customBgColor1, customBgColor2, customBgColor3, customBgColor4, customBgColor5]
      .filter(Boolean)
      .map(c => (monochromeMode ? hexToGrayscale(c) : c))  
      .join(', ');
    
    const gradient = `linear-gradient(${angle}deg, ${colors})`;
    document.body.style.background = gradient;

    console.log(colors);
    
    if (blur && blur > 0) {
      document.body.style.backdropFilter = `blur(${blur}px)`;
    }
    
    if (transparency !== undefined) {
      document.body.style.opacity = `${1 - transparency / 100}`;
    }
  }, [customBackgroundEnabled, customBgColor1, customBgColor2, customBgColor3, customBgColor4, customBgColor5, transparency, angle, blur, monochromeMode]);

  return null;
}
