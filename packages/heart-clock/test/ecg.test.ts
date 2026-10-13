import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { beatWaves, flutterWaves, fWaves } from '../src/ecg.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { leadBaselines, presetParams } from '../src/presets.ts';
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
    // A short delta wave would climb above R: the lower bound keeps R the tallest point.
    expect(() => resolveParams({ qrsDuration: 120, deltaWave: 10 })).toThrow(/deltaWave/);
    for (const [qrs, delta] of [
      [120, 16],
      [90, 12],
      [160, 40],
    ] as const) {
      const p = resolveParams({ prInterval: 120, qrsDuration: qrs, deltaWave: delta });
      const tm = beatTiming(1000, p);
      let peak = -Infinity;
      for (let x = tm.qOnset; x < tm.jPoint; x += 0.25) peak = Math.max(peak, beatWaves(x, tm, p));
      expect(peak, `${qrs}/${delta}`).toBeLessThanOrEqual(1.001);
    }
  });
});

describe('QRS amplitudes and ST shape', () => {
  it('draws an rS complex in V1 and changes nothing in lead II', () => {
    const v1 = presetParams('normal', 'V1');
    const t = beatTiming(1000, v1);
    const qrs = Array.from({ length: 200 }, (_, k) =>
      beatWaves(t.qOnset + (k * v1.qrsDuration) / 199, t, v1),
    );
    expect(Math.max(...qrs)).toBeCloseTo(0.3, 1);
    expect(Math.min(...qrs)).toBeLessThan(-0.9);
    expect(presetParams('normal', 'II')).toEqual(defaultParams);
    expect(presetParams('normal')).toEqual(defaultParams);
  });

  it('bends a raised ST into a coved segment that falls towards the T wave', () => {
    const params = { ...defaultParams, stShift: 0.3, stSlope: 1, tAmplitude: -0.3 };
    const t = beatTiming(1000, params);
    const at = (x: number) => beatWaves(x, t, params);
    const tCentre = t.tEnd - 2.5 * 0.07 * (t.tEnd - t.qOnset);
    const points = Array.from({ length: 20 }, (_, k) =>
      at(t.jPoint + 10 + ((tCentre - t.jPoint - 20) * k) / 19),
    );
    expect(points[0]).toBeGreaterThan(0.2);
    for (let k = 1; k < points.length; k += 1) expect(points[k]).toBeLessThan(points[k - 1] ?? 0);
    expect(at(tCentre)).toBeLessThan(0);
    const flat = { ...params, stSlope: 0, tAmplitude: 0.3 };
    expect(beatWaves(t.jPoint + 60, beatTiming(1000, flat), flat)).toBeCloseTo(0.3, 1);
  });

  it('draws V1, a delta wave and a coved ST together without gaps', () => {
    const params = resolveParams({
      ...leadBaselines.V1,
      prInterval: 100,
      qrsDuration: 140,
      deltaWave: 40,
      stShift: 0.2,
      stSlope: 1,
      tAmplitude: -0.2,
    });
    const t = beatTiming(900, params);
    let previous = beatWaves(0, t, params);
    for (let x = 0.5; x < 900; x += 0.5) {
      const value = beatWaves(x, t, params);
      expect(Math.abs(value - previous), `${x} ms`).toBeLessThan(0.1);
      previous = value;
    }
  });
});

describe('atrial flutter', () => {
  const flutter = { heartRate: 75, pAmplitude: 0, flutterConduction: 4, flutterAmplitude: 0.2 };

  it('puts exactly N sawtooth waves into every beat', () => {
    const params = resolveParams(flutter);
    const t = beatTiming(800, params);
    const values = Array.from({ length: 800 }, (_, k) => flutterWaves(k, t, params));
    // Count the troughs: where the slow fall turns into the quick rise.
    let rises = 0;
    for (let k = 2; k < values.length; k += 1) {
      const [a = 0, b = 0, c = 0] = [values[k - 2], values[k - 1], values[k]];
      if (c > b && b <= a) rises += 1;
    }
    expect(rises).toBe(4);
    expect(Math.max(...values) - Math.min(...values)).toBeCloseTo(0.2, 2);
    expect(flutterWaves(0, t, params)).toBeCloseTo(flutterWaves(800, t, params), 9);
    expect(flutterWaves(123, t, defaultParams)).toBe(0);
  });

  it('keeps the conduction ratio when the heart rate changes', () => {
    for (const heartRate of [60, 75, 100]) {
      const clock = createHeartClock({ ...flutter, heartRate, flutterConduction: 2 });
      const beat = clock.beatAt(3000);
      // Two F waves per beat: the value repeats every half RR.
      const half = beat.rr / 2;
      const t = beat.start + 0.3 * half;
      const params = beat.params;
      expect(flutterWaves(t - beat.start, beat.timing, params)).toBeCloseTo(
        flutterWaves(t - beat.start + half, beat.timing, params),
        9,
      );
    }
  });

  it('rejects flutter with fibrillation, irregular RR or a missing ratio', () => {
    for (const patch of [
      { ...flutter, fWaveAmplitude: 0.05 },
      { ...flutter, rrIrregularity: 0.1 },
      { ...flutter, flutterConduction: 1 },
      { ...flutter, flutterAmplitude: 0 },
      { flutterAmplitude: 0.1 },
      { ...flutter, pauseEvery: 3, pauseDuration: 1300 },
    ]) {
      expect(() => resolveParams(patch), JSON.stringify(patch)).toThrow(/^flutter/);
    }
  });
});
