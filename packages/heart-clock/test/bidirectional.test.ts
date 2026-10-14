import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock } from '../src/clock.ts';
import { resolveParams } from '../src/params.ts';
import { presetParams } from '../src/presets.ts';

// Bidirectional VT: QRS complexes of opposite polarity in an alternating pattern (MSD Manuals,
// Catecholaminergic Polymorphic Ventricular Tachycardia, 2026). Spec: docs/plans/2026-10-14-heart-clock-bidirectional-vt.md.

const id = 'bidirectional-ventricular-tachycardia';

describe('bidirectional ventricular tachycardia', () => {
  it('inverts every second beat, starting upright', () => {
    const clock = createHeartClock(presetParams(id));
    const first = clock.beatAt(10);
    expect(first.index).toBe(0);
    expect(first.inverted).toBe(false);
    const next = clock.beatAt(first.start + first.rr + 1);
    expect(next.inverted).toBe(true);
    const third = clock.beatAt(next.start + next.rr + 1);
    expect(third.inverted).toBe(false);
  });

  it('draws each complex as the mirror image of the one before, in every limb lead', () => {
    const clock = createHeartClock(presetParams(id));
    const a = clock.beatAt(3000);
    const b = clock.beatAt(a.start + a.rr + 1);
    // Away from the edges, where the neighbouring beat's T wave overlaps.
    for (const lead of ['I', 'II', 'III'] as const) {
      const one = Array.from(
        clock.ecgBetween(a.start + a.timing.qOnset, a.start + a.timing.jPoint, 50, lead),
      );
      const two = Array.from(
        clock.ecgBetween(b.start + b.timing.qOnset, b.start + b.timing.jPoint, 50, lead),
      );
      one.forEach((v, k) => expect(two[k], `${lead} sample ${k}`).toBeCloseTo(-v, 2));
      expect(Math.max(...one.map(Math.abs)), lead).toBeGreaterThan(0.2);
    }
  });

  it('keeps the plain VT shape in each beat: wide QRS and no P wave', () => {
    const params = presetParams(id);
    expect(params.qrsDuration).toBeGreaterThanOrEqual(120);
    expect(params.pAmplitude).toBe(0);
    expect(params.heartRate).toBeGreaterThan(100);
  });

  it('refuses P waves and modes that add or drop beats', () => {
    const base = presetParams(id);
    for (const patch of [
      { pAmplitude: 0.15 },
      { rrIrregularity: 0.2 },
      { pauseEvery: 3, pauseDuration: 1000 },
      { ventricularPacing: 1 },
      { ventricularRhythm: 0 },
    ]) {
      expect(() => checkParams(resolveParams(patch, base)), JSON.stringify(patch)).toThrow(
        RangeError,
      );
    }
    expect(() => checkParams(resolveParams({ bidirectional: 0.5 }, base))).toThrow(RangeError);
  });
});
