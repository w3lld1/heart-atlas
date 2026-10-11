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
