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
    ['heartRate', 29],
    ['heartRate', 181],
    ['rrIrregularity', 0.5],
    ['qtc', Number.NaN],
    ['fWaveFrequency', Infinity],
    ['aorticValveGradient', -1],
    ['aorticValveGradient', 101],
    ['s2Split', 101],
    ['pauseEvery', 21],
    ['pauseDuration', 6001],
  ] as const)('rejects %s = %s and names the parameter', (key, value) => {
    expect(() => resolveParams({ [key]: value })).toThrow(new RegExp(`^${key} must be`));
  });

  it('takes pauses only as a whole count from 2 with a length, or not at all', () => {
    expect(resolveParams({ pauseEvery: 3, pauseDuration: 2500 })).toMatchObject({
      pauseEvery: 3,
      pauseDuration: 2500,
    });
    for (const patch of [
      { pauseEvery: 1, pauseDuration: 2000 },
      { pauseEvery: 2.5, pauseDuration: 2000 },
      { pauseEvery: 3 },
      { pauseDuration: 2000 },
    ]) {
      expect(() => resolveParams(patch), JSON.stringify(patch)).toThrow(/^pause/);
    }
  });

  it('takes atrial pacing as 0 or 1, only with a regular sinus-like P wave', () => {
    expect(resolveParams({ atrialPacing: 1 }).atrialPacing).toBe(1);
    expect(() => resolveParams({ atrialPacing: 0.5 })).toThrow(/^atrialPacing must be 0 or 1/);
    for (const patch of [
      { pAmplitude: 0 },
      { pAmplitude: -0.1 },
      { rrIrregularity: 0.1 },
      { fWaveAmplitude: 0.1 },
      { flutterConduction: 2, flutterAmplitude: 0.2, pAmplitude: 0.15 },
      { pauseEvery: 3, pauseDuration: 2000 },
    ]) {
      expect(() => resolveParams({ ...patch, atrialPacing: 1 }), JSON.stringify(patch)).toThrow(
        /^atrialPacing needs/,
      );
    }
  });

  it('takes P waves on their own clock as 0 or 40–150 per minute, only with sinus P waves', () => {
    expect(resolveParams({ atrialRate: 75, heartRate: 40, atrialContribution: 0 }).atrialRate).toBe(
      75,
    );
    for (const atrialRate of [1, 39, 75.5]) {
      expect(() => resolveParams({ atrialRate }), String(atrialRate)).toThrow(
        /^atrialRate must be 0 or an integer from 40 to 150/,
      );
    }
    expect(() => resolveParams({ atrialRate: 151 })).toThrow(/^atrialRate must be a number/);
    for (const patch of [
      { pAmplitude: 0 },
      { rrIrregularity: 0.1 },
      { fWaveAmplitude: 0.1 },
      { flutterConduction: 2, flutterAmplitude: 0.2 },
      { pauseEvery: 3, pauseDuration: 2000 },
      { atrialPacing: 1 },
      { ventricularPacing: 1 },
      { atrialContribution: 0.2 },
    ]) {
      const blocked = { atrialRate: 75, atrialContribution: 0, ...patch };
      expect(() => resolveParams(blocked), JSON.stringify(patch)).toThrow(/^atrialRate needs/);
    }
  });

  it('takes ventricular pacing as 0 or 1, only with a regular rhythm', () => {
    expect(resolveParams({ ventricularPacing: 1 }).ventricularPacing).toBe(1);
    expect(() => resolveParams({ ventricularPacing: 0.5 })).toThrow(
      /^ventricularPacing must be 0 or 1/,
    );
    for (const patch of [
      { rrIrregularity: 0.1 },
      { fWaveAmplitude: 0.1, pAmplitude: 0 },
      { flutterConduction: 2, flutterAmplitude: 0.2 },
      { pauseEvery: 3, pauseDuration: 2000 },
      { deltaWave: 40 },
    ]) {
      expect(
        () => resolveParams({ ...patch, ventricularPacing: 1 }),
        JSON.stringify(patch),
      ).toThrow(/^ventricularPacing needs/);
    }
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
