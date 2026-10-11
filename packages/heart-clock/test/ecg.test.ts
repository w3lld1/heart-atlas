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
