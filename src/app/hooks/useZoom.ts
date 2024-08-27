import { useState } from 'react';

export const useZoom = (step: number, min = 0.1, max = 5) => {
  const [zoom, setZoom] = useState<number>(1);

  const zoomIn = () => {
    const newZ = Math.min(zoom + step, max);

    setZoom(newZ);

    return newZ;
  };

  const zoomOut = () => {
    const newZ = Math.max(zoom - step, min);

    setZoom(newZ);

    return newZ;
  };

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
  };
};
