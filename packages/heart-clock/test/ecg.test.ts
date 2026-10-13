import { describe, expect, it } from 'vitest';
import { beatWaves, fWaves } from '../src/ecg.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { beatTiming } from '../src/timing.ts';

const timing = beatTiming(800, defaultParams);

function trace(params = defaultParams, step = 1): number[] {
  const points: number[] = [];
  for (let t = 0; t < timing.rr; t += step) points.push(beatWaves(t, timing, params));
  return points;
}

describe('beatWaves', () => {
  it('peaks at R with about 1 mV', () => {
    const values = trace();
    const max = Math.max(...values);
    expect(max).toBeGreaterThan(0.9);
    expect(max).toBeLessThan(1.1);
    expect(values.indexOf(max)).toBeCloseTo(timing.rPeak, -1);
  });

  it('has a P wave before Q and a T wave between J and T end', () => {
    const p = beatWaves(timing.pDuration / 2, timing, defaultParams);
    expect(p).toBeCloseTo(defaultParams.pAmplitude, 2);
    const tWave = Math.max(...trace().filter((_, t) => t > timing.jPoint + 40 && t < timing.tEnd));
    expect(tWave).toBeCloseTo(defaultParams.tAmplitude, 1);
  });

  it('is flat at the baseline in diastole and near the ends of the beat', () => {
    expect(Math.abs(beatWaves(timing.tEnd + 20, timing, defaultParams))).toBeLessThan(0.01);
    expect(Math.abs(beatWaves(timing.rr - 1, timing, defaultParams))).toBeLessThan(0.01);
    expect(Math.abs(beatWaves(0, timing, defaultParams))).toBeLessThan(0.01);
  });

  it('removes the P wave, shifts ST and inverts T through parameters', () => {
    const noP = resolveParams({ pAmplitude: 0 });
    expect(beatWaves(timing.pDuration / 2, timing, noP)).toBeCloseTo(0, 3);

    const elevated = resolveParams({ stShift: 0.2 });
    const st = (timing.jPoint + timing.tEnd) / 2 - 40;
    expect(beatWaves(st, timing, elevated) - beatWaves(st, timing, defaultParams)).toBeCloseTo(
      0.2,
      2,
    );

    const inverted = resolveParams({ tAmplitude: -0.3 });
    expect(Math.min(...trace(inverted).slice(Math.ceil(timing.jPoint + 40)))).toBeLessThan(-0.25);
  });
});

describe('fWaves', () => {
  it('is zero when off and bounded by the amplitude when on', () => {
    expect(fWaves(123, defaultParams)).toBe(0);
    const af = resolveParams({ fWaveAmplitude: 0.1 });
    for (let t = 0; t < 2000; t += 7) expect(Math.abs(fWaves(t, af))).toBeLessThanOrEqual(0.1);
  });
});

describe('ST shift with a narrow QRS', () => {
  it('leaves the S wave alone', () => {
    // Value at the centre of the S wave.
    const nadir = (stShift: number) => {
      const params = resolveParams({ qrsDuration: 40, stShift });
      const timing = beatTiming(1000, params);
      return beatWaves(timing.qOnset + 0.8 * 40, timing, params);
    };
    const plain = nadir(0);
    expect(nadir(0.5)).toBeCloseTo(plain, 2);
    expect(nadir(-0.5)).toBeCloseTo(plain, 2);
  });
});

describe('delta wave', () => {
  const params = { ...defaultParams, prInterval: 100, qrsDuration: 140, deltaWave: 50 };
  const timing = beatTiming(1000, params);

  it('starts the QRS with a slow rise and no Q wave, then a steep R', () => {
    const { qOnset } = timing;
    const at = (t: number) => beatWaves(t, timing, params);
    // No dip below the baseline at the start of the QRS.
    for (let t = qOnset; t < qOnset + 50; t += 2) expect(at(t)).toBeGreaterThan(-0.01);
    const deltaSlope = (at(qOnset + 40) - at(qOnset + 10)) / 30;
    const rSlope = (at(timing.rPeak - 5) - at(timing.rPeak - 20)) / 15;
    expect(deltaSlope).toBeGreaterThan(0);
    expect(rSlope).toBeGreaterThan(4 * deltaSlope);
    expect(timing.rPeak).toBeCloseTo(qOnset + 50 + 0.35 * (140 - 50), 9);
    // R keeps its usual height; the slow rise only joins it.
    expect(at(timing.rPeak)).toBeCloseTo(1, 2);
  });

  it('changes nothing at 0 and rejects a delta wave longer than half the QRS', () => {
    const plain = beatTiming(1000, defaultParams);
    expect(beatTiming(1000, { ...defaultParams, deltaWave: 0 })).toEqual(plain);
    expect(() => resolveParams({ qrsDuration: 90, deltaWave: 46 })).toThrow(/deltaWave/);
    expect(() => resolveParams({ qrsDuration: 90, deltaWave: 45 })).not.toThrow();
  });
});
