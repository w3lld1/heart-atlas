import { describe, expect, it } from 'vitest';
import { createHeartClock, type HeartClock } from '../src/clock.ts';
import type { Hemodynamics } from '../src/hemodynamics.ts';
import { defaultParams } from '../src/params.ts';
import { presetParams } from '../src/presets.ts';
import { phaseStarts } from '../src/timing.ts';

const keys = ['lv', 'aorta', 'la', 'volume'] as const;

function series(clock: HeartClock, from: number, to: number, step: number) {
  const out: { t: number; h: Hemodynamics }[] = [];
  for (let t = from; t <= to; t += step) out.push({ t, h: clock.hemodynamicsAt(t) });
  return out;
}

function expectContinuous(clock: HeartClock, from: number, to: number) {
  const points = series(clock, from, to, 0.25);
  for (let i = 1; i < points.length; i += 1) {
    for (const key of keys) {
      const jump = Math.abs((points[i]?.h[key] ?? 0) - (points[i - 1]?.h[key] ?? 0));
      // The fastest change, the rise of LV pressure in early ejection, is under 3 units per 0.25 ms (volume at 150 bpm).
      expect(jump, `${key} at ${points[i]?.t} ms`).toBeLessThan(3);
    }
  }
}

describe('hemodynamicsAt', () => {
  it('holds the ventricle and atrium in a sinus pause while the aorta keeps running off', () => {
    const clock = createHeartClock({ heartRate: 60, pauseEvery: 3, pauseDuration: 2500 });
    expectContinuous(clock, 0, 7000);
    const pause = series(clock, 3000, 5499, 50);
    const first = pause[0]?.h as Hemodynamics;
    for (const { t, h } of pause) {
      for (const key of ['lv', 'la', 'volume'] as const) {
        expect(h[key], `${key} at ${t} ms`).toBeCloseTo(first[key], 6);
      }
    }
    for (let i = 1; i < pause.length; i += 1) {
      expect(pause[i]?.h.aorta).toBeLessThan(pause[i - 1]?.h.aorta ?? 0);
    }
    // The model stretches the run-off over the pause: the aorta still reaches the usual diastolic
    // pressure when the valve opens (spec, section 2), so it ends where a regular beat ends.
    const regular = clock.hemodynamicsAt(1000 + clock.beatAt(1000).timing.ejectionStart).aorta;
    const afterPause = clock.hemodynamicsAt(5500 + clock.beatAt(5500).timing.ejectionStart).aorta;
    expect(afterPause).toBeCloseTo(regular, 6);
  });

  it('is continuous across phases and beats', () => {
    expectContinuous(createHeartClock({ heartRate: 75 }), 0, 4000);
    expectContinuous(createHeartClock({ heartRate: 150, rrIrregularity: 0.2, seed: 5 }), 0, 3000);
  });

  it('stays continuous when parameters change', () => {
    const clock = createHeartClock();
    clock.setParams(
      { lvSystolic: 180, aorticDiastolic: 100, lvEndDiastolic: 25, ejectionFraction: 0.3 },
      500,
    );
    expectContinuous(clock, 0, 3000);
  });

  it('reaches the set systolic and diastolic pressures', () => {
    const clock = createHeartClock({ heartRate: 60 });
    const points = series(clock, 2000, 2999, 0.5).map((p) => p.h);
    expect(Math.max(...points.map((h) => h.lv))).toBeCloseTo(defaultParams.lvSystolic, 3);
    expect(Math.max(...points.map((h) => h.aorta))).toBeCloseTo(defaultParams.lvSystolic, 3);
    expect(Math.min(...points.map((h) => h.aorta))).toBeCloseTo(defaultParams.aorticDiastolic, 0);
    expect(Math.max(...points.map((h) => h.volume))).toBeCloseTo(100, 5);
    expect(Math.min(...points.map((h) => h.volume))).toBeCloseTo(
      100 * (1 - defaultParams.ejectionFraction),
      5,
    );
  });

  it('keeps volume constant in the isovolumic phases and opens valves on pressure', () => {
    const clock = createHeartClock({ heartRate: 75 });
    const beat = clock.beatAt(1600);
    const [, ivc, ejection, ivr, filling] = phaseStarts(beat.timing).map((t) => beat.start + t);
    const at = (t: number) => clock.hemodynamicsAt(t);
    for (const [from, to] of [
      [ivc, ejection],
      [ivr, filling],
    ] as const) {
      const v = at((from ?? 0) + 1).volume;
      expect(at((to ?? 0) - 1).volume).toBeCloseTo(v, 6);
    }
    // Ejection: LV and aorta move together. Diastole: aorta above LV, LA above LV in filling.
    const mid = ((ejection ?? 0) + (ivr ?? 0)) / 2;
    expect(at(mid).aorta).toBe(at(mid).lv);
    const late = (filling ?? 0) + 0.5 * (beat.start + beat.rr - (filling ?? 0));
    expect(at(late).aorta).toBeGreaterThan(at(late).lv);
    expect(at(late).la).toBeGreaterThan(at(late).lv);
  });

  it('keeps each pressure on the side of its valve state', () => {
    for (const params of [
      { heartRate: 45 },
      { heartRate: 75 },
      { heartRate: 150 },
      { heartRate: 75, atrialContribution: 0 },
      { heartRate: 110, atrialContribution: 0.4, lvEndDiastolic: 25 },
    ]) {
      const clock = createHeartClock(params);
      const beat = clock.beatAt(3000);
      const { rPeak, ejectionStart, aorticClosure, mitralOpening } = beat.timing;
      for (let t = 0; t < beat.rr; t += 0.5) {
        const h = clock.hemodynamicsAt(beat.start + t);
        const where = `${JSON.stringify(params)} at ${t} ms`;
        // Closed aortic valve: aorta at or above LV.
        expect(h.aorta, where).toBeGreaterThanOrEqual(h.lv - 1e-9);
        // Open mitral valve: LA at or above LV.
        if (t <= rPeak || t >= mitralOpening)
          expect(h.la, where).toBeGreaterThanOrEqual(h.lv - 0.05);
        // Isovolumic phases: both valves shut, LV between LA and aorta.
        if ((t > rPeak && t < ejectionStart) || (t > aorticClosure && t < mitralOpening)) {
          expect(h.lv, where).toBeGreaterThanOrEqual(h.la);
          expect(h.lv, where).toBeLessThanOrEqual(h.aorta);
        }
      }
    }
  });

  it('keeps the aorta below the ventricle by the mean valve gradient in aortic stenosis', () => {
    for (const heartRate of [50, 75, 140]) {
      const clock = createHeartClock({ ...presetParams('aortic-stenosis'), heartRate });
      const beat = clock.beatAt(3000);
      const { ejectionStart, aorticClosure } = beat.timing;
      let sum = 0;
      let count = 0;
      let lvPeak = 0;
      let aortaPeak = 0;
      let falling = false;
      let previous = beat.params.aorticDiastolic;
      for (let t = ejectionStart + 0.25; t < aorticClosure; t += 0.25) {
        const h = clock.hemodynamicsAt(beat.start + t);
        expect(h.aorta).toBeLessThanOrEqual(h.lv);
        sum += h.lv - h.aorta;
        count += 1;
        lvPeak = Math.max(lvPeak, h.lv);
        aortaPeak = Math.max(aortaPeak, h.aorta);
        // One hump: once the aorta starts to fall during ejection it does not rise again.
        if (h.aorta < previous - 1e-9) falling = true;
        else if (falling)
          expect(h.aorta, `${heartRate} bpm at ${t} ms`).toBeLessThanOrEqual(previous + 1e-9);
        previous = h.aorta;
      }
      expect(Math.abs(sum / count - 40)).toBeLessThan(0.2);
      expect(lvPeak).toBeCloseTo(180, 1);
      // The aortic peak stays near the normal 120 mmHg; the stenosis shows in the ventricle.
      expect(aortaPeak).toBeGreaterThan(105);
      expect(aortaPeak).toBeLessThan(125);
      expectContinuous(clock, 0, 3000);
    }
  });

  it('keeps valve-side order with a stenotic valve and across a switch to and from it', () => {
    const clock = createHeartClock(presetParams('aortic-stenosis'));
    clock.setParams(presetParams('hypertension'), 1500);
    clock.setParams(presetParams('aortic-stenosis'), 3500);
    expectContinuous(clock, 0, 6000);
    for (let t = 0; t < 6000; t += 0.5) {
      const { beat, tInBeat } = clock.sample(t);
      const h = clock.hemodynamicsAt(t);
      const { ejectionStart, aorticClosure } = beat.timing;
      if (tInBeat < ejectionStart || tInBeat > aorticClosure) {
        expect(h.aorta, `at ${t} ms`).toBeGreaterThanOrEqual(h.lv - 1e-9);
      } else {
        expect(h.aorta, `at ${t} ms`).toBeLessThanOrEqual(h.lv + 1e-9);
      }
    }
  });

  it('has no atrial kick in volume when the atria do not contract', () => {
    const clock = createHeartClock({ atrialContribution: 0 });
    const beat = clock.beatAt(1600);
    const start = clock.hemodynamicsAt(beat.start).volume;
    expect(start).toBeCloseTo(100, 6);
  });

  it('rejects pressures that would keep a valve shut', () => {
    expect(() => createHeartClock({ lvSystolic: 85, aorticDiastolic: 80 })).toThrow(RangeError);
    expect(() => createHeartClock({ lvEndDiastolic: 35, aorticDiastolic: 40 })).toThrow(RangeError);
    // A gradient that would keep the aorta from rising 10 mmHg above its diastolic pressure.
    expect(() => createHeartClock({ lvSystolic: 140, aorticValveGradient: 40 })).toThrow(
      RangeError,
    );
  });
});

describe('hemodynamicsAt in second-degree AV block', () => {
  it('holds the ventricle in the pause of a blocked P wave', () => {
    const clock = createHeartClock({ heartRate: 60, blockedP: 1, pauseEvery: 2 });
    expectContinuous(clock, 0, 7000);
    const pause = series(clock, 2000, 2999, 50);
    const first = pause[0]?.h as Hemodynamics;
    for (const { t, h } of pause) {
      for (const key of ['lv', 'la', 'volume'] as const) {
        expect(h[key], `${key} at ${t} ms`).toBeCloseTo(first[key], 6);
      }
    }
  });
});
