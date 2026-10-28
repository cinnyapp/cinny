import { describe, expect, it } from 'vitest';
import { rotatedSize, turn } from './cropGeometry';

describe('rotatedSize', () => {
  it('keeps the size at 0° and 180°', () => {
    expect(rotatedSize(400, 200, 0)).toEqual({ width: 400, height: 200 });
    const half = rotatedSize(400, 200, 180);
    expect(half.width).toBeCloseTo(400);
    expect(half.height).toBeCloseTo(200);
  });

  it('swaps width and height at 90° and 270°', () => {
    const quarter = rotatedSize(400, 200, 90);
    expect(quarter.width).toBeCloseTo(200);
    expect(quarter.height).toBeCloseTo(400);
    const threeQuarters = rotatedSize(400, 200, 270);
    expect(threeQuarters.width).toBeCloseTo(200);
    expect(threeQuarters.height).toBeCloseTo(400);
  });

  it('grows the bounding box for in-between angles', () => {
    const diag = rotatedSize(100, 100, 45);
    expect(diag.width).toBeCloseTo(141.42, 1);
    expect(diag.height).toBeCloseTo(141.42, 1);
  });
});

describe('turn', () => {
  it('rotates right and left in 90° steps, staying within 0–359', () => {
    expect(turn(0, 90)).toBe(90);
    expect(turn(270, 90)).toBe(0);
    expect(turn(0, -90)).toBe(270);
    expect(turn(90, -90)).toBe(0);
  });
});
