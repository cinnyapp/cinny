import { useState } from 'react';

export const useZoom = (step: number, min = 0.1, max = 5) => {
  const [zoom, setZoom] = useState<number>(1);

  const zoomIn = () => {
    setZoom((z) => {
      const newZ = z + step;
      return newZ > max ? z : newZ;
    });
  };

  const zoomOut = () => {
    setZoom((z) => {
      const newZ = z - step;
      return newZ < min ? z : newZ;
    });
  };

  return {
    zoom,
    setZoom,
    zoomIn,
    zoomOut,
  };
};
