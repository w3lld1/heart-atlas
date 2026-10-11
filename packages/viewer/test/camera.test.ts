import { describe, expect, it } from 'vitest';
import { keyAction, orbit, type Vec3 } from '../src/camera.ts';

const limits = { minDistance: 0.1, maxDistance: 1 };
const close = (a: Vec3, b: Vec3): void =>
  a.forEach((v, i) => expect(v).toBeCloseTo(b[i] ?? NaN, 6));

describe('orbit', () => {
  it('turns around the vertical axis', () => {
    close(orbit([0, 0, 0.5], [0, 0, 0], Math.PI / 2, 0, 1, limits), [0.5, 0, 0]);
  });

  it('keeps the distance when tilting and clamps at the poles', () => {
    const p = orbit([0, 0, 0.5], [0, 0, 0], 0, -Math.PI, 1, limits);
    expect(Math.hypot(...p)).toBeCloseTo(0.5, 6);
    expect(p[1]).toBeLessThan(0.5);
    expect(p[1]).toBeGreaterThan(0.49);
  });

  it('zooms within limits, around the target', () => {
    close(orbit([1, 0, 0.5], [1, 0, 0], 0, 0, 0.1, limits), [1, 0, 0.1]);
    close(orbit([0, 0, 0.5], [0, 0, 0], 0, 0, 10, limits), [0, 0, 1]);
  });
});

describe('keyAction', () => {
  it('maps arrows, zoom and reset keys', () => {
    expect(keyAction('ArrowLeft')?.dAzimuth).toBeLessThan(0);
    expect(keyAction('ArrowDown')?.dPolar).toBeGreaterThan(0);
    expect(keyAction('+')?.zoom).toBeLessThan(1);
    expect(keyAction('-')?.zoom).toBeGreaterThan(1);
    expect(keyAction('0')?.reset).toBe(true);
    expect(keyAction('a')).toBeNull();
  });
});
