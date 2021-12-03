/* eslint-disable import/prefer-default-export */
import { useState } from 'react';

export function useForceUpdate() {
  const [, setData] = useState(null);

  return () => setData({});
}
