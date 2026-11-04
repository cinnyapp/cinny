/*
Cinny Project
Copyright 2021-present Ajay Bura
SPDX-License-Identifier: AGPL-3.0-only
https://cinny.in

Please see LICENSE file in root of repository for full details.
*/

import { useCallback, useEffect } from 'react';
import { useAtomValue, useSetAtom } from 'jotai';
import { lastCompositionEndAtom } from '../state/lastCompositionEnd';

interface TimeStamped {
  readonly timeStamp: number;
}

export function useCompositionEndTracking(): void {
  const setLastCompositionEnd = useSetAtom(lastCompositionEndAtom);

  const recordCompositionEnd = useCallback(
    (evt: TimeStamped) => {
      setLastCompositionEnd(evt.timeStamp);
    },
    [setLastCompositionEnd]
  );

  useEffect(() => {
    window.addEventListener('compositionend', recordCompositionEnd, { capture: true });
    return () => {
      window.removeEventListener('compositionend', recordCompositionEnd, { capture: true });
    };
  });
}

interface IsComposingLike {
  readonly timeStamp: number;
  readonly keyCode: number;
  readonly nativeEvent: {
    readonly isComposing?: boolean;
  };
}

export function useComposingCheck({
  compositionEndThreshold = 500,
}: { compositionEndThreshold?: number } = {}): (evt: IsComposingLike) => boolean {
  const compositionEnd = useAtomValue(lastCompositionEndAtom);
  return useCallback(
    (evt: IsComposingLike): boolean =>
      evt.nativeEvent.isComposing ||
      (evt.keyCode === 229 &&
        typeof compositionEnd !== 'undefined' &&
        evt.timeStamp - compositionEnd < compositionEndThreshold),
    [compositionEndThreshold, compositionEnd]
  );
}
