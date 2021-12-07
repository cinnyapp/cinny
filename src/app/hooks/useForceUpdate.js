/* eslint-disable import/prefer-default-export */
import { useState } from 'react';

export function useForceUpdate() {
  const [data, setData] = useState(null);

  return [data, function forceUpdateHook() {
    setData({});
  }];
}
