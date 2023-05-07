/* eslint-disable import/prefer-default-export */

import { useEffect, useState } from 'react';

/**
 *
 * @param {string} name
 * @returns {PermissionStatus | null}
 */
function usePermissionDescriptor(name) {
  const [descriptor, setDescriptor] = useState(null);

  useEffect(() => {
    if (navigator.permissions?.query) {
      navigator.permissions.query({ name }).then((_descriptor) => {
        setDescriptor(_descriptor);
      });
    }
  }, [name]);

  return descriptor;
}

export function usePermission(name, initial) {
  const [state, setState] = useState(initial);
  const descriptor = usePermissionDescriptor(name);

  useEffect(() => {
    // grab the state update from `this` passed to the event listener.
    const update = ({ state: _state }) => setState(_state);

    descriptor?.addEventListener('change', update);

    return () => {
      descriptor?.removeEventListener('change', update);
    };
  }, [descriptor, name]);

  return [state, setState];
}
