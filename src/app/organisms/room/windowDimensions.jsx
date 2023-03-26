import { useState, useEffect } from 'react';

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return {
    width,
    height,
  };
}

export default function useWindowDimensions() {
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());
  const [key, setKey] = useState(0);

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
      setKey(key + 1);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {windowDimensions, key};
}
