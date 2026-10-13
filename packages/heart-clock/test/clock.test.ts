import { describe, expect, it } from 'vitest';
import { createHeartClock, historyMs } from '../src/clock.ts';
import { beatTiming } from '../src/timing.ts';
import { defaultParams } from '../src/params.ts';
import { soundEvents } from '../src/sounds.ts';

describe('createHeartClock', () => {
  it('lays regular beats back to back from t = 0', () => {
    const clock = createHeartClock({ heartRate: 60 });
    const beats = clock.beatsBetween(0, 5000);
    expect(beats.map((b) => b.start)).toEqual([0, 1000, 2000, 3000, 4000, 5000]);
    expect(clock.beatAt(2500).index).toBe(2);
  });

  it('samples phase and ECG consistently with the beat timing', () => {
    const clock = createHeartClock({ heartRate: 60 });
    const timing = beatTiming(1000, clock.params);
    const sample = clock.sample(3000 + timing.rPeak);
    expect(sample.beat.index).toBe(3);
    expect(sample.tInBeat).toBeCloseTo(timing.rPeak);
    expect(sample.phase).toBe('isovolumic-contraction');
    expect(sample.ecg).toBeGreaterThan(0.9);
  });

  it('keeps the ECG continuous across beat boundaries', () => {
    const clock = createHeartClock({ heartRate: 150 });
    for (let t = 1; t < 4000; t += 1) {
      expect(Math.abs(clock.ecgAt(t) - clock.ecgAt(t - 1))).toBeLessThan(0.2);
    }
  });

  it('gives a reproducible irregular rhythm for the same seed', () => {
    const rrs = (seed: number) =>
      createHeartClock({ heartRate: 110, rrIrregularity: 0.3, seed })
        .beatsBetween(0, 8000)
        .map((b) => b.rr);
    expect(rrs(7)).toEqual(rrs(7));
    expect(rrs(7)).not.toEqual(rrs(8));
    const values = rrs(7);
    expect(new Set(values.map((v) => Math.round(v))).size).toBeGreaterThan(5);
    for (const rr of values) {
      expect(rr).toBeGreaterThanOrEqual((60000 / 110) * 0.7 - 1e-9);
      expect(rr).toBeLessThanOrEqual((60000 / 110) * 1.3 + 1e-9);
    }
  });

  it('applies setParams from the next beat and keeps the current one', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.beatsBetween(0, 5000);
    expect(clock.setParams({ heartRate: 120 }, 2500)).toBe(3);
    expect(clock.beatAt(2500).rr).toBe(1000);
    expect(clock.beatAt(3000).start).toBe(3000);
    expect(clock.beatAt(3000).rr).toBe(500);
    expect(clock.beatAt(3600).index).toBe(4);
    expect(clock.params.heartRate).toBe(120);
  });

  it('rejects invalid parameters when they are set, not during playback', () => {
    expect(() =>
      createHeartClock({ heartRate: 180, rrIrregularity: 0.3, prInterval: 250 }),
    ).toThrow(RangeError);
    const clock = createHeartClock();
    expect(() => clock.setParams({ heartRate: 180, qrsDuration: 160 }, 0)).toThrow(RangeError);
    expect(clock.params).toEqual(defaultParams);
  });

  it('accepts every heart rate in range with maximal irregularity at default intervals', () => {
    for (let rate = 40; rate <= 180; rate += 1) {
      expect(() => createHeartClock({ heartRate: rate, rrIrregularity: 0.3 })).not.toThrow();
    }
  });

  it('keeps two beats of look-ahead and drops old history', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.sample(20_500);
    expect(clock.beatsBetween(20_500, 22_999).length).toBe(3);
    expect(() => clock.sample(20_500 - historyMs - 1500)).toThrow(/older than the kept history/);
    expect(() => clock.sample(-1)).toThrow(RangeError);
  });

  it('gives a time exactly at a beat boundary to the new beat', () => {
    const clock = createHeartClock({ heartRate: 60 });
    expect(clock.beatAt(1000).index).toBe(1);
    expect(clock.sample(1000).tInBeat).toBe(0);
  });

  it.each([
    { fWaveAmplitude: 0.3, pAmplitude: 0 },
    { stShift: 0.4 },
    { qrsDuration: 140 },
    { heartRate: 150 },
    { tAmplitude: -0.5 },
  ])('keeps the ECG continuous across setParams(%o)', (patch) => {
    const clock = createHeartClock({ fWaveAmplitude: 0.1, fWaveFrequency: 5 });
    clock.setParams(patch, 500);
    let previous = clock.ecgAt(0);
    for (let t = 0.5; t < 3000; t += 0.5) {
      const value = clock.ecgAt(t);
      // The steepest wave (R) changes by under 0.04 mV per 0.5 ms.
      expect(Math.abs(value - previous)).toBeLessThan(0.05);
      previous = value;
    }
  });

  it('does not let callers change parameters without validation', () => {
    const clock = createHeartClock();
    expect(Object.isFrozen(clock.params)).toBe(true);
    expect(Object.isFrozen(clock.beatAt(0).params)).toBe(true);
  });

  it('draws a strip with ecgBetween that matches ecgAt', () => {
    const clock = createHeartClock({ heartRate: 90, rrIrregularity: 0.2, seed: 3 });
    const strip = clock.ecgBetween(1000, 9000, 801);
    expect(strip.length).toBe(801);
    for (const k of [0, 37, 400, 799, 800]) {
      expect(strip[k]).toBeCloseTo(clock.ecgAt(1000 + k * 10), 12);
    }
    expect(() => clock.ecgBetween(10, 0, 5)).toThrow(RangeError);
    expect(() => clock.ecgBetween(0, 10, 1)).toThrow(RangeError);
  });

  it('answers a query that reaches far ahead without dropping its start', () => {
    const clock = createHeartClock({ heartRate: 60 });
    expect(clock.beatsBetween(100, 9000).length).toBe(10);
  });

  it('restarts the schedule after a long jump instead of filling the gap', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.sample(1000);
    const started = Date.now();
    const sample = clock.sample(3_600_000);
    expect(Date.now() - started).toBeLessThan(50);
    expect(sample.beat.start).toBe(3_600_000);
    expect(clock.ecgAt(3_600_500)).toBeTypeOf('number');
  });
});

describe('sinus pauses', () => {
  const paused = { heartRate: 60, pauseEvery: 3, pauseDuration: 2500 } as const;

  it('adds the pause after every third beat and keeps the rhythm timing', () => {
    const clock = createHeartClock(paused);
    const beats = clock.beatsBetween(0, 9000);
    expect(beats.map((b) => b.start)).toEqual([0, 1000, 2000, 5500, 6500, 7500]);
    expect(beats.map((b) => b.pause)).toEqual([0, 0, 2500, 0, 0, 2500]);
    expect(beats[2]?.rr).toBe(3500);
    expect(beats[2]?.timing).toEqual(beats[1]?.timing);
  });

  it('draws a flat line in the pause and plays no sounds in it', () => {
    const clock = createHeartClock(paused);
    // The T wave of the third beat ends well before its rhythm RR of 1000 ms.
    for (let t = 3100; t < 5400; t += 50) {
      expect(clock.ecgAt(t)).toBeCloseTo(0, 3);
      expect(clock.sample(t)).toMatchObject({ pause: true, phase: 'filling' });
    }
    expect(clock.sample(2500).pause).toBe(false);
    const sounds = clock.beatsBetween(0, 9000).flatMap(soundEvents);
    expect(sounds.filter((e) => e.time > 3000 && e.time < 5500)).toEqual([]);
  });

  it('applies setParams after the pause and keeps the pause that has started', () => {
    const clock = createHeartClock(paused);
    clock.beatAt(4000);
    clock.setParams({ pauseEvery: 0, pauseDuration: 0 }, 4000);
    const beats = clock.beatsBetween(2000, 8000);
    expect(beats.map((b) => b.start)).toEqual([2000, 5500, 6500, 7500]);
    expect(beats.map((b) => b.pause)).toEqual([2500, 0, 0, 0]);
  });

  it('changes nothing with pauses off', () => {
    const plain = createHeartClock({ heartRate: 60 }).beatsBetween(0, 5000);
    expect(plain.every((b) => b.pause === 0 && b.rr === b.timing.rr)).toBe(true);
  });
});

describe('slow rhythms', () => {
  it('runs at 30 bpm and keeps an irregular rhythm no slower than 40 bpm or its mean', () => {
    const slow = createHeartClock({ heartRate: 30 }).beatsBetween(0, 6000);
    expect(slow.map((b) => b.start)).toEqual([0, 2000, 4000, 6000]);
    const irregular = createHeartClock({ heartRate: 45, rrIrregularity: 0.3, seed: 7 });
    const rrs = irregular.beatsBetween(0, 9000).map((b) => b.rr);
    expect(Math.max(...rrs)).toBeLessThanOrEqual(1500);
    const slowIrregular = createHeartClock({ heartRate: 35, rrIrregularity: 0.3, seed: 7 });
    expect(Math.max(...slowIrregular.beatsBetween(0, 9000).map((b) => b.rr))).toBeLessThanOrEqual(
      60000 / 35 + 1e-9,
    );
  });
});

describe('atrial pacing', () => {
  it('changes no curve, phase or beat: the spike is drawn apart from the trace', () => {
    const sinus = createHeartClock({ heartRate: 60 });
    const paced = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    for (let t = 0; t < 4000; t += 7) {
      expect(paced.ecgAt(t)).toBe(sinus.ecgAt(t));
      expect(paced.hemodynamicsAt(t)).toEqual(sinus.hemodynamicsAt(t));
      expect(paced.beatAt(t).timing).toEqual(sinus.beatAt(t).timing);
    }
  });
});
