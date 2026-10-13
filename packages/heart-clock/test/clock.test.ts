import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock, heartRateLimits, historyMs } from '../src/clock.ts';
import { beatWaves, dissociatedP, dissociatedPOnset } from '../src/ecg.ts';
import { beatTiming, pDurationAt, phaseAt } from '../src/timing.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
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

describe('P waves on their own clock', () => {
  const block = { atrialRate: 75, heartRate: 40, atrialContribution: 0 };

  it('needs a P wave rate above the QRS rate, so the heart rate limits stop below it', () => {
    expect(() => checkParams(resolveParams({ ...block, heartRate: 75 }))).toThrow(
      /^atrialRate \(75\) must be above heartRate \(75\)/,
    );
    expect(heartRateLimits(resolveParams(block))[1]).toBe(74);
  });

  it('draws a P wave every 800 ms of clock time, apart from the beats, and beats without one', () => {
    const clock = createHeartClock(block);
    const peak = (k: number) => k * 800 + pDurationAt(800, clock.params) / 2;
    // QRS complexes every 1500 ms; these P waves fall between a T wave and the next QRS, where the
    // trace is the P wave alone.
    for (const k of [1, 3, 5, 7]) {
      const beat = clock.beatAt(peak(k));
      const inBeat = peak(k) - beat.start;
      expect(inBeat).toBeGreaterThan(beat.timing.tEnd);
      expect(inBeat).toBeLessThan(beat.timing.qOnset + beat.rr - 100);
      expect(clock.ecgAt(peak(k))).toBeCloseTo(0.15, 3);
    }
    expect(dissociatedP(peak(3), clock.params)).toBeCloseTo(0.15, 6);
    expect(dissociatedP(peak(3), { ...clock.params, atrialRate: 0 })).toBe(0);
    // A beat alone has no P wave: at its own P peak only the far tails of other waves are left.
    const beat = clock.beatAt(0);
    expect(Math.abs(beatWaves(beat.timing.pDuration / 2, beat.timing, beat.params))).toBeLessThan(
      0.01,
    );
  });

  it('keeps P waves going after a long jump in time', () => {
    const clock = createHeartClock(block);
    clock.ecgAt(1000);
    const t = 60_000 + pDurationAt(800, clock.params) / 2;
    const beat = clock.beatAt(t);
    // After the jump the beats start afresh at the queried time, so this P wave peaks before the
    // QRS of its beat.
    expect(t - beat.start).toBeLessThan(beat.timing.qOnset - 50);
    expect(clock.ecgAt(t)).toBeCloseTo(0.15, 2);
    expect(dissociatedPOnset(t, clock.params)).toBe(60_000);
  });

  it('calls the start of a beat filling, not atrial systole', () => {
    const clock = createHeartClock(block);
    const beat = clock.beatAt(3000);
    expect(clock.sample(beat.start + 1).phase).toBe('filling');
    expect(clock.sample(beat.start + beat.timing.rPeak + 1).phase).toBe('isovolumic-contraction');
    expect(phaseAt(1, beat.timing, beat.params)).toBe('filling');
    expect(phaseAt(1, beat.timing, defaultParams)).toBe('atrial-systole');
  });

  it('fades P waves in and out when the preset changes in the middle of a P wave', () => {
    // At 37 bpm the third beat starts 3243 ms in, 43 ms into the P wave at 3200; at 74 bpm the
    // fourth starts 2432 ms in, 32 ms into the P wave at 2400. Without the fade the trace would
    // jump by most of a P wave there.
    const slowBlock = { ...block, heartRate: 37 };
    const sinus = { atrialRate: 0, heartRate: 74, atrialContribution: 0.2 };
    for (const [from, to, at] of [
      [slowBlock, sinus, 3243],
      [sinus, slowBlock, 2432],
    ] as const) {
      const clock = createHeartClock(from);
      clock.ecgAt(at);
      clock.setParams(to, at);
      const next = clock.beatAt(at + 1).start;
      const blocked = from === slowBlock ? clock.beatAt(at).params : clock.params;
      expect(next - at).toBeLessThan(1);
      expect(dissociatedP(next, blocked)).toBeGreaterThan(0.1);
      const values = clock.ecgBetween(at - 500, at + 3000, 3501);
      let largest = 0;
      for (let i = 1; i < values.length; i += 1) {
        largest = Math.max(largest, Math.abs((values[i] ?? 0) - (values[i - 1] ?? 0)));
      }
      // The steepest part of a beat is the R upstroke; a step in the baseline would be larger.
      expect(largest).toBeLessThan(0.1);
    }
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
