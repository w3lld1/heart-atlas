import { gradientPeakPerMean } from '../src/valve.ts';
import { describe, expect, it } from 'vitest';
import { defaultParams, paramRanges, resolveParams } from '../src/params.ts';

describe('resolveParams', () => {
  it('returns the defaults for an empty patch', () => {
    expect(resolveParams()).toEqual(defaultParams);
  });

  it('merges a patch over the base', () => {
    expect(resolveParams({ heartRate: 120 }).heartRate).toBe(120);
    expect(resolveParams({ stShift: 0.2 }, { ...defaultParams, heartRate: 50 })).toMatchObject({
      heartRate: 50,
      stShift: 0.2,
    });
  });

  it.each([
    ['heartRate', 39],
    ['heartRate', 181],
    ['rrIrregularity', 0.5],
    ['qtc', Number.NaN],
    ['fWaveFrequency', Infinity],
    ['aorticValveGradient', -1],
    ['aorticValveGradient', 101],
    ['s2Split', 101],
  ] as const)('rejects %s = %s and names the parameter', (key, value) => {
    expect(() => resolveParams({ [key]: value })).toThrow(new RegExp(`^${key} must be`));
  });

  it('allows a valve gradient right up to the aortic peak limit', () => {
    // The aortic peak is lvSystolic less the peak drop; it must be at least diastolic + 10.
    const limit = (120 - 90) / gradientPeakPerMean;
    expect(() => resolveParams({ aorticValveGradient: limit })).not.toThrow();
    expect(() => resolveParams({ aorticValveGradient: limit + 0.01 })).toThrow(RangeError);
  });

  it('rejects unknown keys and a fractional seed', () => {
    expect(() => resolveParams({ pulse: 70 } as never)).toThrow(RangeError);
    expect(() => resolveParams({ toString: 5 } as never)).toThrow(RangeError);
    expect(() => resolveParams({ seed: 1.5 })).toThrow(/seed must be an integer/);
  });

  it('keeps every default inside its range', () => {
    for (const [key, [min, max]] of Object.entries(paramRanges)) {
      const value = defaultParams[key as keyof typeof defaultParams];
      expect(value).toBeGreaterThanOrEqual(min);
      expect(value).toBeLessThanOrEqual(max);
    }
  });
});
