import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock, heartRateLimits } from '../src/clock.ts';
import { defaultParams, paramRanges } from '../src/params.ts';
import { isPresetId, presetIds, presetParams, presets } from '../src/presets.ts';
import { soundEvents } from '../src/sounds.ts';

describe('presets', () => {
  it('has a parameter set for every id', () => {
    expect(Object.keys(presets).sort()).toEqual([...presetIds].sort());
    expect(presetParams('normal')).toEqual(defaultParams);
  });

  it('keeps every preset valid across its heart rate limits', () => {
    for (const id of presetIds) {
      const [min, max] = heartRateLimits(presetParams(id));
      // The wide QRS of atrial septal defect is the only one that does not fit the fastest rates.
      if (id === 'atrial-septal-defect') expect([min, max]).toEqual([40, 169]);
      else expect([min, max]).toEqual(paramRanges.heartRate);
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
