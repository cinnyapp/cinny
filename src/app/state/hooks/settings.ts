import { atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { createContext, useContext, useMemo } from 'react';
import { Settings, SettingsAtom } from '../settings';

const SettingsAtomContext = createContext<SettingsAtom | null>(null);

export const SettingsAtomProvider = SettingsAtomContext.Provider;
export const useSettingsAtom = () => {
  const settingsAtom = useContext(SettingsAtomContext);

  if (!settingsAtom) {
    throw new Error('Settings atom not provided!');
  }

  return settingsAtom;
};

export const useSettings = () => {
  const settingsAtom = useSettingsAtom();

  return useAtomValue(settingsAtom);
};

export type SettingSetter<K extends keyof Settings> =
  | Settings[K]
  | ((s: Settings[K]) => Settings[K]);

export const useSetSetting = <K extends keyof Settings>(key: K) => {
  const settingsAtom = useSettingsAtom();

  const setterAtom = useMemo(
    () =>
      atom<null, [SettingSetter<K>], undefined>(null, (get, set, value) => {
        const s = { ...get(settingsAtom) };
        s[key] = typeof value === 'function' ? value(s[key]) : value;
        set(settingsAtom, s);
      }),
    [settingsAtom, key]
  );

  return useSetAtom(setterAtom);
};

export const useSetting = <K extends keyof Settings>(
  key: K
): [Settings[K], ReturnType<typeof useSetSetting<K>>] => {
  const settingsAtom = useSettingsAtom();

  const selector = useMemo(() => (s: Settings) => s[key], [key]);

  const setting = useAtomValue(selectAtom(settingsAtom, selector));

  const setter = useSetSetting(key);

  return [setting, setter];
};
