/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { ReactNode, RefObject, useCallback, useRef, useState } from 'react';
import { useDebounce } from '../hooks/useDebounce';

type ConfirmPasswordMatchProps = {
  initialValue: boolean;
  children: (
    match: boolean,
    doMatch: () => void,
    passRef: RefObject<HTMLInputElement>,
    confPassRef: RefObject<HTMLInputElement>
  ) => ReactNode;
};
export function ConfirmPasswordMatch({ initialValue, children }: ConfirmPasswordMatchProps) {
  const [match, setMatch] = useState(initialValue);
  const passRef = useRef<HTMLInputElement>(null);
  const confPassRef = useRef<HTMLInputElement>(null);

  const doMatch = useDebounce(
    useCallback(() => {
      const pass = passRef.current?.value;
      const confPass = confPassRef.current?.value;
      if (!confPass) {
        setMatch(initialValue);
        return;
      }
      setMatch(pass === confPass);
    }, [initialValue]),
    {
      wait: 500,
      immediate: false,
    }
  );

  return children(match, doMatch, passRef, confPassRef);
}
