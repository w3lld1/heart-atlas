import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock, heartRateLimits } from '../src/clock.ts';
import { defaultParams, paramRanges } from '../src/params.ts';
import {
  isPresetId,
  presetIds,
  presetParams,
  presetRateFloors,
  presetRateLimits,
  presets,
  setsHeartRate,
  switchedHeartRate,
  type PresetId,
} from '../src/presets.ts';
import { soundEvents } from '../src/sounds.ts';

// Presets that do not fit every heart rate: the wide QRS of atrial septal defect does not fit the
// fastest rates, nor does the long PR of first-degree AV block. SVT has a floor: its rate is the
// sign, 120–250 bpm.
const narrowedLimits: Partial<Record<PresetId, readonly [number, number]>> = {
  'atrial-septal-defect': [40, 169],
  'av-block-first-degree': [40, 96],
  'supraventricular-tachycardia': [120, 180],
};

describe('presets', () => {
  it('has a parameter set for every id', () => {
    expect(Object.keys(presets).sort()).toEqual([...presetIds].sort());
    expect(presetParams('normal')).toEqual(defaultParams);
  });

  it('keeps every preset valid across its heart rate limits', () => {
    for (const id of presetIds) {
      const [min, max] = presetRateLimits(id);
      expect([min, max], id).toEqual(narrowedLimits[id] ?? paramRanges.heartRate);
      const start = presetParams(id).heartRate;
      expect(start, `${id} starting rate`).toBeGreaterThanOrEqual(min);
      expect(start, `${id} starting rate`).toBeLessThanOrEqual(max);
      for (let heartRate = min; heartRate <= max; heartRate += 1) {
        expect(
          () => checkParams({ ...presetParams(id), heartRate }),
          `${id} at ${heartRate}`,
        ).not.toThrow();
      }
    }
  });

  it('resets what another preset changed', () => {
    const clock = createHeartClock(presetParams('atrial-fibrillation'));
    clock.setParams(presetParams('stemi'), 0);
    const beat = clock.beatAt(5000);
    expect(beat.params.pAmplitude).toBe(defaultParams.pAmplitude);
    expect(beat.params.rrIrregularity).toBe(0);
    expect(beat.params.stShift).toBe(0.2);
  });

  it('recognises preset ids', () => {
    expect(isPresetId('aortic-stenosis')).toBe(true);
    expect(isPresetId('af')).toBe(false);
    expect(isPresetId('toString')).toBe(false);
  });

  it('raises ST by the preset value already at the J point in STEMI', () => {
    const clock = createHeartClock(presetParams('stemi'));
    const beat = clock.beatAt(3000);
    expect(clock.sample(beat.start + beat.timing.jPoint).ecg).toBeGreaterThanOrEqual(0.18);
    const normal = createHeartClock();
    const plain = normal.beatAt(3000);
    expect(Math.abs(normal.sample(plain.start + plain.timing.jPoint).ecg)).toBeLessThan(0.02);
  });

  it('keeps PR above 0.20 s at every heart rate in first-degree AV block', () => {
    const params = presetParams('av-block-first-degree');
    const [min, max] = heartRateLimits(params);
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const beat = createHeartClock({ ...params, heartRate }).beatAt(0);
      // PR runs from the onset of the P wave to the onset of QRS.
      expect(beat.timing.qOnset, `at ${heartRate}`).toBeGreaterThan(200);
      expect(beat.params.pAmplitude).toBe(defaultParams.pAmplitude);
    }
    expect(createHeartClock(params).beatAt(0).timing.qOnset).toBeCloseTo(233, 0);
  });

  it('shows a fast regular narrow-QRS rhythm without a P wave in SVT', () => {
    const params = presetParams('supraventricular-tachycardia');
    expect(params.heartRate).toBe(170);
    const [min, max] = presetRateLimits('supraventricular-tachycardia');
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const clock = createHeartClock({ ...params, heartRate });
      const beats = [clock.beatAt(1000), clock.beatAt(3000), clock.beatAt(6000)];
      for (const beat of beats) {
        // Regular rhythm: every RR is the mean RR.
        expect(beat.rr, `at ${heartRate}`).toBeCloseTo(60000 / heartRate, 9);
        // Narrow QRS, ≤120 ms.
        expect(beat.timing.jPoint - beat.timing.qOnset, `at ${heartRate}`).toBeLessThanOrEqual(120);
      }
    }
    // No P wave before the QRS: the trace stays flat where a normal beat has its P wave.
    const clock = createHeartClock(params);
    const beat = clock.beatAt(3000);
    for (let time = 0; time < beat.timing.qOnset; time += 1) {
      expect(Math.abs(clock.sample(beat.start + time).ecg), `at ${time} ms`).toBeLessThan(0.02);
    }
    const normal = createHeartClock({ ...defaultParams, heartRate: 170 });
    const plain = normal.beatAt(3000);
    const pPeak = Math.max(
      ...Array.from(
        { length: Math.floor(plain.timing.qOnset) },
        (_, time) => normal.sample(plain.start + time).ecg,
      ),
    );
    expect(pPeak).toBeGreaterThan(0.1);
  });

  it('splits S2 on every beat in atrial septal defect', () => {
    const clock = createHeartClock(presetParams('atrial-septal-defect'));
    for (const time of [1000, 3000, 6000]) {
      const beat = clock.beatAt(time);
      const events = soundEvents(beat);
      const s2 = events.find((event) => event.sound === 'S2');
      const p2 = events.find((event) => event.sound === 'P2');
      expect((p2?.time ?? 0) - (s2?.time ?? 0)).toBeCloseTo(50, 9);
    }
    expect(soundEvents(createHeartClock().beatAt(1000)).map((event) => event.sound)).toEqual([
      'S1',
      'S2',
    ]);
  });
});

describe('preset heart rate', () => {
  it('raises the lower limit to the preset floor and fails when nothing is left', () => {
    expect(presetRateFloors['supraventricular-tachycardia']).toBe(120);
    expect(heartRateLimits(presetParams('supraventricular-tachycardia'))).toEqual(
      paramRanges.heartRate,
    );
    expect(presetRateLimits('supraventricular-tachycardia')).toEqual([120, 180]);
    // A caller's parameters that only fit slower rates leave nothing above the floor.
    expect(() =>
      presetRateLimits('supraventricular-tachycardia', {
        ...presetParams('supraventricular-tachycardia'),
        prInterval: 260,
      }),
    ).toThrow(RangeError);
  });

  it('sets the rate only when switching to or from a preset that has its own', () => {
    expect(presetIds.filter(setsHeartRate)).toEqual(['supraventricular-tachycardia']);
    expect(switchedHeartRate('normal', 'supraventricular-tachycardia', 90)).toBe(170);
    expect(switchedHeartRate('supraventricular-tachycardia', 'normal', 150)).toBe(75);
    expect(switchedHeartRate('normal', 'stemi', 90)).toBe(90);
    expect(switchedHeartRate('stemi', 'atrial-fibrillation', 110)).toBe(110);
    // A caller that changed the next preset's starting rate gets that rate.
    expect(switchedHeartRate('supraventricular-tachycardia', 'normal', 150, 90)).toBe(90);
  });
});

describe('heartRateLimits', () => {
  it('gives the whole range for the defaults and narrows it for a wide QRS', () => {
    expect(heartRateLimits(defaultParams)).toEqual(paramRanges.heartRate);
    const [, max] = heartRateLimits({ ...defaultParams, qrsDuration: 130 });
    expect(max).toBeLessThan(180);
    expect(() => checkParams({ ...defaultParams, qrsDuration: 130, heartRate: max })).not.toThrow();
    expect(() => checkParams({ ...defaultParams, qrsDuration: 130, heartRate: max + 1 })).toThrow(
      RangeError,
    );
  });
});
