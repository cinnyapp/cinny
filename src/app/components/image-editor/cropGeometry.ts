export type Size = { width: number; height: number };

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

// Bounding box of a width × height image rotated by `rotation` degrees.
export const rotatedSize = (width: number, height: number, rotation: number): Size => {
  const rad = toRadians(rotation);
  return {
    width: Math.abs(Math.cos(rad) * width) + Math.abs(Math.sin(rad) * height),
    height: Math.abs(Math.sin(rad) * width) + Math.abs(Math.cos(rad) * height),
  };
};

// Rotation after turning by `delta` degrees, kept within 0–359.
export const turn = (rotation: number, delta: number): number =>
  (((rotation + delta) % 360) + 360) % 360;
