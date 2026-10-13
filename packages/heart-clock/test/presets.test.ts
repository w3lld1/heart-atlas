import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock, heartRateLimits } from '../src/clock.ts';
import { defaultParams, defaultRateLimits, paramRanges } from '../src/params.ts';
import {
  isPresetId,
  presetIds,
  presetLead,
  presetParams,
  presetRateFloors,
  presetRateLimits,
  presetTreated,
  rateLimitsFrom,
  presets,
  setsHeartRate,
  switchedHeartRate,
  type PresetId,
} from '../src/presets.ts';
import { flutterWaves } from '../src/ecg.ts';
import { pDurationAt } from '../src/timing.ts';
import { soundEvents } from '../src/sounds.ts';

// Presets that do not fit every heart rate: the wide QRS of atrial septal defect does not fit the
// fastest rates, nor does the long PR of first-degree AV block or the long QT of long QT syndrome.
// SVT has a floor: its rate is the sign, 120–250 bpm. VT has both: a floor above 100 bpm, and its
// wide QRS does not fit the fastest rates. Atrial flutter has a floor and a ceiling: at 2:1 its F
// waves run at twice the ventricular rate, inside 250–350 per minute. Sick sinus syndrome stays
// below 40 bpm, from the model's lowest rate of 30. In WPW syndrome the delta wave moves the R peak
// later, so the wide QRS does not fit the fastest rates. The pacemaker after sick sinus syndrome
// keeps its lower rate at 50–70. Mobitz I stops at 70, below the 76 its longest PR allows.
const narrowedLimits: Partial<Record<PresetId, readonly [number, number]>> = {
  'atrial-septal-defect': [40, 169],
  'av-block-first-degree': [40, 96],
  'av-block-second-degree-mobitz-1': [40, 70],
  'av-block-third-degree': [35, 50],
  'av-block-third-degree-paced': [60, 100],
  'supraventricular-tachycardia': [120, 180],
  'long-qt-syndrome': [40, 137],
  'ventricular-tachycardia': [101, 169],
  'atrial-flutter': [126, 175],
  'sick-sinus-syndrome': [30, 39],
  'sick-sinus-syndrome-paced': [50, 70],
  'wpw-syndrome': [40, 153],
};

describe('presetTreated', () => {
  it('points each disease to an existing preset that is not normal, drawn in the same lead', () => {
    for (const [disease, treated] of Object.entries(presetTreated) as [PresetId, PresetId][]) {
      expect(presetIds).toContain(disease);
      expect(presetIds).toContain(treated);
      expect(treated).not.toBe('normal');
      expect(treated).not.toBe(disease);
      expect(presetLead(treated)).toBe(presetLead(disease));
    }
  });

  it('paces the atria after sick sinus syndrome, with no pauses', () => {
    const params = presetParams('sick-sinus-syndrome-paced');
    expect(params).toMatchObject({ atrialPacing: 1, pauseEvery: 0, heartRate: 60 });
    expect(presetParams('sick-sinus-syndrome').atrialPacing).toBe(0);
  });

  it('paces the ventricles after complete AV block, following the P waves', () => {
    const block = presetParams('av-block-third-degree');
    expect(block).toMatchObject({ atrialRate: 75, heartRate: 40, atrialContribution: 0 });
    const paced = presetParams('av-block-third-degree-paced');
    expect(paced).toMatchObject({ ventricularPacing: 1, atrialRate: 0, heartRate: 75 });
    expect(paced.qrsDuration).toBeGreaterThanOrEqual(120);
    expect(paced.tAmplitude).toBeLessThan(0);
    expect(presetTreated['av-block-third-degree']).toBe('av-block-third-degree-paced');
  });

  it('lets the PR of complete AV block wander at the starting rate, with P waves on QRS or T', () => {
    const clock = createHeartClock(presetParams('av-block-third-degree'));
    const period = 60000 / clock.params.atrialRate;
    const prs = new Set<number>();
    let hidden = 0;
    // A 9 s strip: each beat's PR is the time from the latest P onset to its QRS.
    for (const beat of clock.beatsBetween(1000, 10_000)) {
      const qrs = beat.start + beat.timing.qOnset;
      prs.add(Math.round(qrs - Math.floor(qrs / period) * period));
    }
    for (let onset = Math.ceil(1000 / period) * period; onset < 10_000; onset += period) {
      const peak = onset + pDurationAt(period, clock.params) / 2;
      const beat = clock.beatAt(peak);
      const inBeat = peak - beat.start;
      if (inBeat >= beat.timing.qOnset && inBeat <= beat.timing.tEnd) hidden += 1;
    }
    expect(prs.size).toBeGreaterThanOrEqual(3);
    expect(hidden).toBeGreaterThanOrEqual(1);
  });
});

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

  it('shows regular sawtooth F waves at twice the ventricular rate in atrial flutter', () => {
    const params = presetParams('atrial-flutter');
    expect(params.heartRate).toBe(150);
    expect(params.atrialContribution).toBe(0);
    const [min, max] = presetRateLimits('atrial-flutter');
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      // 2:1 conduction: the atria run at twice the ventricular rate, 250–350 per minute, with an
      // F-wave cycle under 240 ms.
      const atrialRate = 2 * heartRate;
      expect(atrialRate, `at ${heartRate}`).toBeGreaterThanOrEqual(250);
      expect(atrialRate, `at ${heartRate}`).toBeLessThanOrEqual(350);
      expect(60000 / atrialRate, `at ${heartRate}`).toBeLessThan(240);
      const clock = createHeartClock({ ...params, heartRate });
      // The same rhythm without flutter: what is left is the F waves alone.
      const plain = createHeartClock({
        ...params,
        heartRate,
        flutterConduction: 0,
        flutterAmplitude: 0,
      });
      for (const time of [1000, 3000, 6000]) {
        const beat = clock.beatAt(time);
        // Regular rhythm: every RR is the mean RR.
        expect(beat.rr, `at ${heartRate}`).toBeCloseTo(60000 / heartRate, 9);
        const f = Array.from(
          { length: Math.floor(beat.rr) },
          (_, t) => clock.ecgAt(beat.start + t) - plain.ecgAt(beat.start + t),
        );
        // Two sawtooth troughs (a slow fall turning into a quick rise) in every beat.
        let troughs = 0;
        for (let k = 2; k < f.length; k += 1) {
          const [a = 0, b = 0, c = 0] = [f[k - 2], f[k - 1], f[k]];
          if (c > b && b <= a) troughs += 1;
        }
        expect(troughs, `at ${heartRate}, ${time} ms`).toBe(2);
        expect(Math.max(...f) - Math.min(...f), `at ${heartRate}`).toBeCloseTo(0.2, 2);
        // The difference is the model's F waves, which repeat every half RR.
        const at = Math.round(0.3 * beat.rr);
        expect(f[at]).toBeCloseTo(flutterWaves(at, beat.timing, beat.params), 9);
        expect(flutterWaves(at, beat.timing, beat.params)).toBeCloseTo(
          flutterWaves(at + beat.rr / 2, beat.timing, beat.params),
          9,
        );
      }
      // No P wave under the F waves: without them the trace is flat up to the QRS.
      const plainBeat = plain.beatAt(3000);
      for (let t = 0; t < plainBeat.timing.qOnset; t += 1) {
        expect(Math.abs(plain.ecgAt(plainBeat.start + t)), `at ${heartRate}, ${t} ms`).toBeLessThan(
          0.02,
        );
      }
    }
  });

  it('shows sinus bradycardia with pauses that have no P wave and no QRS in sick sinus syndrome', () => {
    const params = presetParams('sick-sinus-syndrome');
    expect(params.heartRate).toBe(35);
    const [min, max] = presetRateLimits('sick-sinus-syndrome');
    // Below 40 per minute, the lowest normal daytime resting rate in both guidelines.
    expect(max).toBeLessThan(40);
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const clock = createHeartClock({ ...params, heartRate });
      const rr = 60000 / heartRate;
      const beats = clock.beatsBetween(0, 9000);
      expect(beats.length, `at ${heartRate}`).toBeGreaterThanOrEqual(4);
      for (const beat of beats) {
        // A pause after every third beat, longer than 2.5 s; the rhythm between pauses is regular.
        const pause = beat.index % 3 === 2 ? 3000 : 0;
        expect(beat.pause, `at ${heartRate}, beat ${beat.index}`).toBe(pause);
        expect(beat.rr, `at ${heartRate}, beat ${beat.index}`).toBeCloseTo(rr + pause, 9);
        // Every beat starts with a P wave: sinus rhythm.
        const pPeak = Math.max(
          ...Array.from({ length: Math.floor(beat.timing.qOnset) }, (_, t) =>
            clock.ecgAt(beat.start + t),
          ),
        );
        expect(pPeak, `at ${heartRate}, beat ${beat.index}`).toBeGreaterThan(0.1);
      }
      const paused = beats.find((beat) => beat.pause > 0);
      const next = paused && beats.find((beat) => beat.index === paused.index + 1);
      if (!paused || !next) throw new Error(`no pause in 9 s at ${heartRate}`);
      // From QRS to QRS around the pause: 4.5–5 s.
      const gap = next.start + next.timing.qOnset - (paused.start + paused.timing.qOnset);
      expect(gap, `at ${heartRate}`).toBeGreaterThanOrEqual(4500);
      expect(gap, `at ${heartRate}`).toBeLessThanOrEqual(5000);
      // In the pause there is no P wave and no QRS: the line stays flat, and no sound plays.
      for (let dt = 1; dt < paused.pause; dt += 10) {
        const t = paused.start + paused.timing.rr + dt;
        expect(clock.sample(t).pause, `at ${heartRate}, ${t} ms`).toBe(true);
        expect(Math.abs(clock.ecgAt(t)), `at ${heartRate}, ${t} ms`).toBeLessThan(0.02);
      }
      const sounds = beats.flatMap(soundEvents);
      expect(
        sounds.filter((e) => e.time > paused.start + paused.timing.rr && e.time < next.start),
      ).toEqual([]);
    }
  });

  it('shows a short PR, a delta wave and a wide QRS in sinus rhythm in WPW syndrome', () => {
    const params = presetParams('wpw-syndrome');
    expect(presetLead('wpw-syndrome')).toBe('II');
    expect(params.heartRate).toBe(defaultParams.heartRate);
    const [min, max] = presetRateLimits('wpw-syndrome');
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const clock = createHeartClock({ ...params, heartRate });
      const beat = clock.beatAt(3000);
      const at = (t: number) => clock.ecgAt(beat.start + t);
      // Regular sinus rhythm: every RR is the mean RR, and a P wave comes before every QRS.
      expect(beat.rr, `at ${heartRate}`).toBeCloseTo(60000 / heartRate, 9);
      const pPeak = Math.max(
        ...Array.from({ length: Math.floor(beat.timing.qOnset) }, (_, t) => at(t)),
      );
      expect(pPeak, `at ${heartRate}`).toBeGreaterThan(0.1);
      // PR (from the onset of P to the onset of QRS) under 120 ms, QRS over 120 ms.
      expect(beat.timing.qOnset, `at ${heartRate}`).toBeLessThan(120);
      expect(beat.timing.jPoint - beat.timing.qOnset, `at ${heartRate}`).toBeGreaterThan(120);
      // Delta wave: the QRS starts with a slow rise, not a Q wave, and R then rises far faster.
      const { qOnset } = beat.timing;
      const delta = beat.params.deltaWave;
      for (let t = 0; t <= delta; t += 1) {
        expect(at(qOnset + t), `at ${heartRate}, ${t} ms into QRS`).toBeGreaterThan(-0.02);
      }
      const deltaSlope = (at(qOnset + delta) - at(qOnset)) / delta;
      expect(deltaSlope, `at ${heartRate}`).toBeGreaterThan(0);
      let steepest = 0;
      for (let t = qOnset + delta; t < beat.timing.rPeak; t += 1) {
        steepest = Math.max(steepest, at(t + 1) - at(t));
      }
      expect(deltaSlope, `at ${heartRate}`).toBeLessThan(0.3 * steepest);
    }
    // The normal beat starts its QRS with a small Q wave instead.
    const normal = createHeartClock().beatAt(3000);
    const q = Math.min(
      ...Array.from({ length: 30 }, (_, t) =>
        createHeartClock().ecgAt(normal.start + normal.timing.qOnset + t),
      ),
    );
    expect(q).toBeLessThan(-0.05);
  });

  it('shows a coved ST elevation of at least 0.2 mV into a negative T in lead V1 in Brugada syndrome', () => {
    const params = presetParams('brugada-syndrome');
    expect(presetLead('brugada-syndrome')).toBe('V1');
    // The V1 baseline: an rS complex, with a small R wave and a deep S wave.
    expect(params.rAmplitude).toBeLessThan(-params.sAmplitude);
    expect(params.heartRate).toBe(defaultParams.heartRate);
    const [min, max] = presetRateLimits('brugada-syndrome');
    for (let heartRate = min; heartRate <= max; heartRate += 1) {
      const clock = createHeartClock({ ...params, heartRate });
      const beat = clock.beatAt(3000);
      const at = (t: number) => clock.ecgAt(beat.start + t);
      const { jPoint, qOnset, tEnd } = beat.timing;
      // Sinus rhythm: a P wave before every QRS, and regular RR.
      expect(beat.rr, `at ${heartRate}`).toBeCloseTo(60000 / heartRate, 9);
      const pPeak = Math.max(...Array.from({ length: Math.floor(qOnset) }, (_, t) => at(t)));
      expect(pPeak, `at ${heartRate}`).toBeGreaterThan(0.1);
      // Type 1: at least 2 mm (0.2 mV) at the J point ...
      expect(at(jPoint), `at ${heartRate}`).toBeGreaterThanOrEqual(0.2);
      // ... falling all the way (coved) into a negative T wave.
      const tCentre = tEnd - 2.5 * 0.07 * (tEnd - qOnset);
      let previous = at(jPoint + 10);
      for (let t = jPoint + 11; t <= tCentre; t += 1) {
        const value = at(t);
        expect(value, `at ${heartRate}, ${t - jPoint} ms after J`).toBeLessThan(previous);
        previous = value;
      }
      expect(at(tCentre), `at ${heartRate}`).toBeLessThan(-0.2);
    }
    // Normal in V1 has no ST elevation: the trace is near the baseline at the J point.
    const normal = createHeartClock(presetParams('normal', 'V1'));
    const plain = normal.beatAt(3000);
    expect(Math.abs(normal.ecgAt(plain.start + plain.timing.jPoint))).toBeLessThan(0.05);
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
    // A ceiling (atrial flutter) limits the slider from above too.
    expect(rateLimitsFrom(defaultParams, 40, 'Flutter', 100)).toEqual([40, 100]);
    expect(() => rateLimitsFrom(defaultParams, 120, 'Flutter', 100)).toThrow(/Flutter/);
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
      'av-block-second-degree-mobitz-1',
      'av-block-second-degree-mobitz-2',
      'av-block-third-degree',
      'av-block-third-degree-paced',
      'supraventricular-tachycardia',
      'ventricular-tachycardia',
      'atrial-flutter',
      'sick-sinus-syndrome',
      'sick-sinus-syndrome-paced',
    ]);
    expect(switchedHeartRate('av-block-third-degree', 'av-block-third-degree-paced', 40)).toBe(75);
    expect(switchedHeartRate('normal', 'av-block-third-degree', 90)).toBe(40);
    expect(switchedHeartRate('sick-sinus-syndrome', 'sick-sinus-syndrome-paced', 35)).toBe(60);
    expect(switchedHeartRate('sick-sinus-syndrome-paced', 'normal', 60)).toBe(75);
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
    // Atrial flutter and sick sinus syndrome set their own rates as well.
    expect(switchedHeartRate('normal', 'atrial-flutter', 90)).toBe(150);
    expect(switchedHeartRate('atrial-flutter', 'sick-sinus-syndrome', 150)).toBe(35);
    expect(switchedHeartRate('sick-sinus-syndrome', 'stemi', 35)).toBe(75);
    // WPW and Brugada syndromes keep the reader's rate.
    expect(switchedHeartRate('normal', 'wpw-syndrome', 90)).toBe(90);
    expect(switchedHeartRate('wpw-syndrome', 'brugada-syndrome', 90)).toBe(90);
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

describe('second-degree AV block', () => {
  it('drops a P wave in second-degree AV block, with a growing PR only in Mobitz I', () => {
    const qrsGaps = (id: PresetId) => {
      const clock = createHeartClock(presetParams(id));
      const beats = clock.beatsBetween(0, 9000);
      return {
        prs: beats.slice(0, 4).map((b) => Math.round(b.timing.qOnset)),
        gaps: beats
          .slice(0, 4)
          .map((b, i) =>
            Math.round(
              (beats[i + 1]?.start ?? 0) +
                (beats[i + 1]?.timing.rPeak ?? 0) -
                b.start -
                b.timing.rPeak,
            ),
          ),
      };
    };
    // Mobitz I at 60: PR 180, 260, 340 and back to 180; the QRS after the dropped P comes late.
    expect(qrsGaps('av-block-second-degree-mobitz-1')).toEqual({
      prs: [180, 260, 340, 180],
      gaps: [1080, 1080, 1840, 1080],
    });
    // Mobitz II at 75: the same PR, and the RR across the block twice the others.
    const mobitz2 = qrsGaps('av-block-second-degree-mobitz-2');
    expect(new Set(mobitz2.prs).size).toBe(1);
    expect(mobitz2.gaps).toEqual([800, 1600, 800, 1600]);
    expect(presetTreated['av-block-second-degree-mobitz-1']).toBeUndefined();
    expect(presetTreated['av-block-second-degree-mobitz-2']).toBeUndefined();
  });
});
