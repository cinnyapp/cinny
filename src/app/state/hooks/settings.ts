import { atom, useAtomValue, useSetAtom, WritableAtom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { useMemo } from 'react';
import { Settings } from '../settings';

export const useSetting = <K extends keyof Settings>(
  settingsAtom: WritableAtom<Settings, Settings>,
  key: K
): [Settings[K], (value: Settings[K]) => void] => {
  const selector = useMemo(() => (s: Settings) => s[key], [key]);
  const setting = useAtomValue(selectAtom(settingsAtom, selector));

  const setterAtom = useMemo(
    () =>
      atom<null, Settings[K]>(null, (get, set, value) => {
        const s = { ...get(settingsAtom) };
        s[key] = value;
        set(settingsAtom, s);
      }),
    [settingsAtom, key]
  );

  const setter = useSetAtom(setterAtom);

  return [setting, setter];
};
