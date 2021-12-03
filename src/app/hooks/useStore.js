/* eslint-disable import/prefer-default-export */
import { useEffect, useRef } from 'react';

export function useStore(...args) {
  const itemRef = useRef(null);

  const getItem = () => itemRef.current;

  const setItem = (event) => {
    itemRef.current = event;
    return itemRef.current;
  };

  useEffect(() => {
    itemRef.current = null;
    return () => {
      itemRef.current = null;
    };
  }, args);

  return { getItem, setItem };
}
