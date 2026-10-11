import { describe, expect, it } from 'vitest';
import { ease, openValvePoint, squeezePoint, valveFrame } from '../src/cycle.ts';

describe('squeezePoint', () => {
  it('keeps the point at 0 and moves it towards the centre', () => {
    expect(squeezePoint([2, 0, 0], [0, 0, 0], 0)).toEqual([2, 0, 0]);
    expect(squeezePoint([2, 4, 0], [0, 2, 0], 0.5)).toEqual([1, 3, 0]);
  });
});

describe('valveFrame', () => {
  // A flat disc of points in the plane y = 1 with radius 2.
  const disc: number[] = [];
  for (let k = 0; k < 16; k++) {
    const a = (k / 16) * 2 * Math.PI;
    disc.push(2 * Math.cos(a), 1, 2 * Math.sin(a), Math.cos(a), 1, Math.sin(a));
  }
  disc.push(0, 1.05, 0);

  it('finds the centre, the plane normal and the radius', () => {
    const frame = valveFrame(disc);
    expect(frame.center[1]).toBeCloseTo(1, 1);
    expect(Math.abs(frame.normal[1])).toBeCloseTo(1, 3);
    expect(frame.radius).toBeCloseTo(2, 1);
  });

  it('finds a plane whose normal is orthogonal to (1, 1, 1)', () => {
    // The same disc in the plane x = y: its normal (1, -1, 0)/√2 is orthogonal to (1, 1, 1).
    const s = Math.SQRT1_2;
    const tilted: number[] = [];
    for (let i = 0; i < disc.length; i += 3) {
      const [x = 0, y = 0, z = 0] = disc.slice(i, i + 3);
      tilted.push(x * s + (y - 1) * s, x * s - (y - 1) * s, z);
    }
    const frame = valveFrame(tilted);
    expect(Math.abs(frame.normal[0] * s - frame.normal[1] * s)).toBeCloseTo(1, 3);
  });

  it('uses a given flow axis when chordae dominate the spread', () => {
    // Chordae: a long column of points along x below the disc, which misleads the PCA.
    const withChordae = [...disc];
    for (let k = 0; k < 40; k++) withChordae.push(-4 + k * 0.2, -3, 0);
    const frame = valveFrame(withChordae, [0, 3, 0]);
    expect(frame.normal).toEqual([0, 1, 0]);
    expect(frame.radius).toBeGreaterThan(0);
  });

  it('handles an empty mesh', () => {
    expect(valveFrame([]).radius).toBe(0);
  });
});

describe('openValvePoint', () => {
  const frame = {
    center: [0, 0, 0] as [number, number, number],
    normal: [0, 1, 0] as [number, number, number],
    radius: 2,
  };

  it('moves points in the plane towards the rim and keeps height', () => {
    expect(openValvePoint([1, 0.5, 0], frame, 0)).toEqual([1, 0.5, 0]);
    const open = openValvePoint([1, 0.5, 0], frame, 1);
    expect(open[0]).toBeCloseTo(2);
    expect(open[1]).toBeCloseTo(0.5);
  });

  it('leaves points on the axis and outside the orifice alone', () => {
    expect(openValvePoint([0, 1, 0], frame, 1)).toEqual([0, 1, 0]);
    expect(openValvePoint([3, 0, 0], frame, 1)).toEqual([3, 0, 0]);
  });
});

describe('ease', () => {
  it('approaches the target without overshooting and ignores zero time', () => {
    expect(ease(0, 1, 0, 40)).toBe(0);
    const v = ease(0, 1, 40, 40);
    expect(v).toBeGreaterThan(0.6);
    expect(v).toBeLessThan(0.7);
    expect(ease(0, 1, 10_000, 40)).toBeCloseTo(1);
  });
});
