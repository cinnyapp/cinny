import { atom, useAtomValue, useSetAtom, WritableAtom } from 'jotai';
import { SetAtom } from 'jotai/core/atom';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { Settings } from '../settings';

export const useSetSetting = <K extends keyof Settings>(
  settingsAtom: WritableAtom<Settings, Settings>,
  key: K
) => {
  const setterAtom = useMemo(
    () =>
      atom<null, Settings[K] | ((s: Settings[K]) => Settings[K])>(null, (get, set, value) => {
        const s = { ...get(settingsAtom) };
        s[key] = typeof value === 'function' ? value(s[key]) : value;
        set(settingsAtom, s);
      }),
    [settingsAtom, key]
  );

  return useSetAtom(setterAtom);
};

export const useSetting = <K extends keyof Settings>(
  settingsAtom: WritableAtom<Settings, Settings>,
  key: K
): [Settings[K], SetAtom<Settings[K] | ((s: Settings[K]) => Settings[K]), void>] => {
  const selector = useMemo(() => (s: Settings) => s[key], [key]);
  const setting = useAtomValue(selectAtom(settingsAtom, selector));

  const setter = useSetSetting(settingsAtom, key);
  return [setting, setter];
};
