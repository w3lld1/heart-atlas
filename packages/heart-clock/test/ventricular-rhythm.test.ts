import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { cycleState } from '../src/cycle.ts';
import { resolveParams } from '../src/params.ts';
import { presetParams } from '../src/presets.ts';

// Issue #389: a rhythm from the ventricles has no atrial systole and does not pass the AV node.
describe('ventricularRhythm', () => {
  for (const id of ['ventricular-tachycardia', 'bidirectional-ventricular-tachycardia'] as const) {
    it(`${id}: no atrial systole, AV node or bundle branches over several beats`, () => {
      const clock = createHeartClock({ ...presetParams(id), heartRate: 150 });
      const phases = new Set<string>();
      const excited = new Set<string>();
      for (let t = 0; t < 4000; t += 1) {
        const state = cycleState(clock, t);
        phases.add(state.phase);
        for (const part of state.excited) excited.add(part);
        expect(state.contraction['left-atrium']).toBe(0);
      }
      expect(phases).not.toContain('atrial-systole');
      expect([...excited]).toEqual([]);
    });
  }

  it('draws no a wave: LA pressure does not rise before the QRS', () => {
    const clock = createHeartClock({ ...presetParams('ventricular-tachycardia'), heartRate: 150 });
    const beat = clock.beatAt(2000);
    const before = clock.hemodynamicsAt(beat.start).la;
    const atQ = clock.hemodynamicsAt(beat.start + beat.timing.qOnset - 1e-6).la;
    expect(atQ).toBeLessThanOrEqual(before + 1e-9);
  });

  it('needs no P wave, atrial kick, pacing or atrial modes', () => {
    const vt = { ventricularRhythm: 1, pAmplitude: 0, atrialContribution: 0 };
    expect(resolveParams(vt).ventricularRhythm).toBe(1);
    for (const patch of [
      { pAmplitude: 0.15 },
      { atrialContribution: 0.2 },
      { fWaveAmplitude: 0.05, rrIrregularity: 0.1 },
      { ventricularPacing: 1 },
      { atrialPacing: 1 },
      { atrialRate: 120 },
      { prematureEvery: 3 },
      { deltaWave: 20 },
    ]) {
      expect(() => resolveParams({ ...vt, ...patch })).toThrow(/^ventricularRhythm needs/);
    }
    expect(() => resolveParams({ ventricularRhythm: 0.5 })).toThrow(/ventricularRhythm must be/);
    expect(() => resolveParams({ ...vt, bidirectional: 1, ventricularRhythm: 0 })).toThrow(
      /^bidirectional needs ventricularRhythm/,
    );
  });

  it('keeps the AV node in supraventricular tachycardia, which has no P wave either', () => {
    const clock = createHeartClock(presetParams('supraventricular-tachycardia'));
    const beat = clock.beatAt(2000);
    const { timing } = beat;
    expect(
      cycleState(clock, beat.start + (timing.pDuration + timing.qOnset) / 2).excited,
    ).toContain('av-node');
  });
});
