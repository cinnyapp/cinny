/* eslint-disable import/prefer-default-export */

import { useEffect, useState } from 'react';

export function usePermission(name, initial) {
  const [state, setState] = useState(initial);

  useEffect(() => {
    let descriptor;

    const update = () => setState(descriptor.state);

    if (navigator.permissions?.query) {
      navigator.permissions.query({ name }).then((_descriptor) => {
        descriptor = _descriptor;

        update();
        descriptor.addEventListener('change', update);
      });
    }

    return () => {
      if (descriptor) descriptor.removeEventListener('change', update);
    };
  }, []);

  return [state, setState];
}
