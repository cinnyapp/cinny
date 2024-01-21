import { atom, useAtomValue, useSetAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { Settings, settingsAtom as sAtom } from '../settings';

export type SettingSetter<K extends keyof Settings> =
  | Settings[K]
  | ((s: Settings[K]) => Settings[K]);

export const useSetSetting = <K extends keyof Settings>(settingsAtom: typeof sAtom, key: K) => {
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
  settingsAtom: typeof sAtom,
  key: K
): [Settings[K], ReturnType<typeof useSetSetting<K>>] => {
  const selector = useMemo(() => (s: Settings) => s[key], [key]);
  const setting = useAtomValue(selectAtom(settingsAtom, selector));

  const setter = useSetSetting(settingsAtom, key);
  return [setting, setter];
};
