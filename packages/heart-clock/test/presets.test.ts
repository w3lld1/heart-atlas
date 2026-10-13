import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock, heartRateLimits } from '../src/clock.ts';
import { defaultParams, defaultRateLimits, paramRanges } from '../src/params.ts';
import {
  isPresetId,
  presetIds,
  presetParams,
  presetRateFloors,
  presetRateLimits,
  rateLimitsFrom,
  presets,
  setsHeartRate,
  switchedHeartRate,
  type PresetId,
} from '../src/presets.ts';
import { soundEvents } from '../src/sounds.ts';

// Presets that do not fit every heart rate: the wide QRS of atrial septal defect does not fit the
// fastest rates, nor does the long PR of first-degree AV block or the long QT of long QT syndrome.
// SVT has a floor: its rate is the sign, 120–250 bpm. VT has both: a floor above 100 bpm, and its
// wide QRS does not fit the fastest rates.
const narrowedLimits: Partial<Record<PresetId, readonly [number, number]>> = {
  'atrial-septal-defect': [40, 169],
  'av-block-first-degree': [40, 96],
  'supraventricular-tachycardia': [120, 180],
  'long-qt-syndrome': [40, 137],
  'ventricular-tachycardia': [101, 169],
};

describe('presets', () => {
  it('has a parameter set for every id', () => {
    expect(Object.keys(presets).sort()).toEqual([...presetIds].sort());
    expect(presetParams('normal')).toEqual(defaultParams);
  });

  it('keeps every preset valid across its heart rate limits', () => {
    for (const id of presetIds) {
      const [min, max] = presetRateLimits(id);
      expect([min, max], id).toEqual(narrowedLimits[id] ?? defaultRateLimits);
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

  it('keeps QTc at the preset value, above 480 ms, at every heart rate in long QT syndrome', () => {
    const params = presetParams('long-qt-syndrome');
    expect(params.heartRate).toBe(defaultParams.heartRate);
    const [min, max] = presetRateLimits('long-qt-syndrome');
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const beat = createHeartClock({ ...params, heartRate }).beatAt(3000);
      // QT runs from the onset of QRS to the end of T; QTc corrects it with Bazett's √RR.
      const qtc = (beat.timing.tEnd - beat.timing.qOnset) / Math.sqrt(beat.rr / 1000);
      expect(qtc, `at ${heartRate}`).toBeCloseTo(500, 6);
      expect(qtc, `at ${heartRate}`).toBeGreaterThanOrEqual(480);
    }
    // The QT of 500 ms at 60 bpm no longer fits the beat above 137 bpm.
    expect(() => checkParams({ ...params, heartRate: max + 1 })).toThrow(RangeError);
    const normal = createHeartClock().beatAt(3000);
    const long = createHeartClock(params).beatAt(3000);
    expect(long.timing.tEnd - long.timing.qOnset).toBeGreaterThan(
      normal.timing.tEnd - normal.timing.qOnset,
    );
  });

  it('shows a fast regular wide-QRS rhythm without P waves and with a discordant T in VT', () => {
    const params = presetParams('ventricular-tachycardia');
    expect(params.heartRate).toBe(150);
    const [min, max] = presetRateLimits('ventricular-tachycardia');
    // VT is more than 100 beats per minute.
    expect(min).toBeGreaterThan(100);
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const clock = createHeartClock({ ...params, heartRate });
      for (const time of [1000, 3000, 6000]) {
        const beat = clock.beatAt(time);
        // Regular rhythm: every RR is the mean RR.
        expect(beat.rr, `at ${heartRate}`).toBeCloseTo(60000 / heartRate, 9);
        // Wide QRS, ≥120 ms.
        expect(beat.timing.jPoint - beat.timing.qOnset, `at ${heartRate}`).toBeGreaterThanOrEqual(
          120,
        );
        // No P wave before the QRS: the trace stays flat up to its onset.
        for (let t = 0; t < beat.timing.qOnset; t += 1) {
          expect(
            Math.abs(clock.sample(beat.start + t).ecg),
            `at ${heartRate}, ${t} ms`,
          ).toBeLessThan(0.02);
        }
        // The QRS is mainly positive and the T wave goes the other way.
        expect(clock.sample(beat.start + beat.timing.rPeak).ecg).toBeGreaterThan(0.5);
        let lowest = 0;
        for (let t = Math.ceil(beat.timing.jPoint); t < beat.timing.tEnd; t += 1) {
          const value = clock.sample(beat.start + t).ecg;
          expect(value, `at ${heartRate}, ${t} ms`).toBeLessThan(0.02);
          lowest = Math.min(lowest, value);
        }
        expect(lowest, `at ${heartRate}`).toBeLessThan(-0.2);
      }
    }
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
  it('offers 40–180 unless a preset sets its own floor, though the model goes down to 30', () => {
    expect(paramRanges.heartRate[0]).toBe(30);
    expect(heartRateLimits(defaultParams)).toEqual([30, 180]);
    expect(presetRateLimits('normal')).toEqual(defaultRateLimits);
    expect(defaultRateLimits).toEqual([40, 180]);
    // A preset with its own floor of 30 (a slow rhythm) gets the whole lower range.
    expect(rateLimitsFrom(defaultParams, 30)).toEqual([30, 180]);
    expect(rateLimitsFrom(defaultParams, 35)).toEqual([35, 180]);
  });

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
    expect(presetIds.filter(setsHeartRate)).toEqual([
      'supraventricular-tachycardia',
      'ventricular-tachycardia',
    ]);
    expect(presetRateFloors['ventricular-tachycardia']).toBe(101);
    expect(switchedHeartRate('normal', 'supraventricular-tachycardia', 90)).toBe(170);
    expect(switchedHeartRate('supraventricular-tachycardia', 'normal', 150)).toBe(75);
    expect(switchedHeartRate('normal', 'stemi', 90)).toBe(90);
    expect(switchedHeartRate('stemi', 'atrial-fibrillation', 110)).toBe(110);
    expect(switchedHeartRate('normal', 'ventricular-tachycardia', 90)).toBe(150);
    expect(switchedHeartRate('supraventricular-tachycardia', 'ventricular-tachycardia', 170)).toBe(
      150,
    );
    // Long QT syndrome keeps the reader's rate; leaving VT for it goes back to its 75.
    expect(switchedHeartRate('normal', 'long-qt-syndrome', 90)).toBe(90);
    expect(switchedHeartRate('ventricular-tachycardia', 'long-qt-syndrome', 150)).toBe(75);
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
