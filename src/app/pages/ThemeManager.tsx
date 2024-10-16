import { useEffect } from 'react';
import { configClass, varsClass } from 'folds';
import { DarkTheme, LightTheme, ThemeKind, useSystemThemeKind, useThemes } from '../hooks/useTheme';
import { useSetting } from '../state/hooks/settings';
import { settingsAtom } from '../state/settings';

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

export function AuthRouteThemeManager() {
  const systemThemeKind = useSystemThemeKind();
  const themes = useThemes();
  const [systemTheme] = useSetting(settingsAtom, 'useSystemTheme');
  const [themeId] = useSetting(settingsAtom, 'themeId');
  const [lightThemeId] = useSetting(settingsAtom, 'lightThemeId');
  const [darkThemeId] = useSetting(settingsAtom, 'darkThemeId');

  // apply normal theme if system theme is disabled
  useEffect(() => {
    if (!systemTheme) {
      document.body.className = '';
      document.body.classList.add(configClass, varsClass);
      const selectedTheme = themes.find((theme) => theme.id === themeId) ?? LightTheme;

      document.body.classList.add(...selectedTheme.classNames);
    }
  }, [systemTheme, themes, themeId]);

  // apply preferred system theme if system theme is enabled
  useEffect(() => {
    if (systemTheme) {
      document.body.className = '';
      document.body.classList.add(configClass, varsClass);
      const selectedTheme =
        systemThemeKind === ThemeKind.Dark
          ? themes.find((theme) => theme.id === darkThemeId) ?? DarkTheme
          : themes.find((theme) => theme.id === lightThemeId) ?? LightTheme;

      document.body.classList.add(...selectedTheme.classNames);
    }
  }, [systemTheme, systemThemeKind, themes, lightThemeId, darkThemeId]);

  return null;
}
