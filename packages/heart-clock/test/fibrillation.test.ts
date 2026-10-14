import { describe, expect, it } from 'vitest';
import { checkParams, createHeartClock } from '../src/clock.ts';
import { cycleState } from '../src/cycle.ts';
import { vfWaves } from '../src/ecg.ts';
import { resolveParams, type HeartParams } from '../src/params.ts';
import { soundEvents } from '../src/sounds.ts';

// Ventricular fibrillation: irregular oscillations from 300 per minute with changing shape and
// size, no P, QRS or T, and no ejection (Minzdrav 2025, 569_2, 1.1; MSD Manuals, Ventricular
// Fibrillation, 2024). Spec: docs/plans/2026-10-14-heart-clock-ventricular-fibrillation.md.

const vf: Partial<HeartParams> = {
  ventricularFibrillation: 1,
  pAmplitude: 0,
  atrialContribution: 0,
};

/** Samples of `f` from `from` to `to` ms at 1 ms steps. */
function samples(f: (t: number) => number, from: number, to: number): number[] {
  const out: number[] = [];
  for (let t = from; t < to; t += 1) out.push(f(t));
  return out;
}

function correlation(a: readonly number[], b: readonly number[]): number {
  let ab = 0;
  let aa = 0;
  let bb = 0;
  a.forEach((x, k) => {
    const y = b[k] as number;
    ab += x * y;
    aa += x * x;
    bb += y * y;
  });
  return ab / Math.sqrt(aa * bb);
}

describe('vfWaves', () => {
  const params = resolveParams(vf);

  it('is 0 without ventricular fibrillation', () => {
    const normal = resolveParams({});
    for (let t = 0; t < 2000; t += 37) expect(vfWaves(t, normal)).toBe(0);
  });

  it('crosses zero at 300 per minute or faster in every 2 s window, lead and seed', () => {
    for (const seed of [1, 2, 7919, 0xdeadbeef]) {
      const seeded = resolveParams({ ...vf, seed });
      for (const lead of ['I', 'II', 'III'] as const) {
        for (let from = 0; from < 60_000; from += 2000) {
          const strip = samples((t) => vfWaves(t, seeded, lead), from, from + 2000);
          let crossings = 0;
          for (let k = 1; k < strip.length; k += 1) {
            if (Math.sign(strip[k] as number) !== Math.sign(strip[k - 1] as number)) crossings += 1;
          }
          // Two crossings per oscillation; 300 per minute is 10 oscillations in 2 s.
          expect(crossings, `seed ${seed} ${lead} from ${from} ms`).toBeGreaterThanOrEqual(20);
        }
      }
    }
  });

  it('does not repeat: no period between 1 and 3 s over a minute', () => {
    // A narrow band makes short windows look alike by chance, so the test looks at a whole minute:
    // a period would correlate close to 1 there.
    for (const lead of ['I', 'II', 'III'] as const) {
      const strip = samples((t) => vfWaves(t, params, lead), 0, 63_000);
      for (let lag = 1000; lag <= 3000; lag += 10) {
        const c = correlation(strip.slice(0, 60_000), strip.slice(lag, lag + 60_000));
        expect(Math.abs(c), `${lead} lag ${lag} ms`).toBeLessThan(0.5);
      }
    }
  });

  it('keeps the vector at or below 0.8 mV, so every lead fits the strip', () => {
    for (let t = 0; t < 30_000; t += 3) {
      const one = vfWaves(t, params, 'I');
      // Lead I is the X axis; II at 60° gives Y.
      const y = (vfWaves(t, params, 'II') - one * Math.cos(Math.PI / 3)) / Math.sin(Math.PI / 3);
      expect(Math.hypot(one, y)).toBeLessThanOrEqual(0.8 + 1e-9);
    }
  });

  it('differs between seeds and between leads', () => {
    const other = resolveParams({ ...vf, seed: params.seed + 1 });
    const a = samples((t) => vfWaves(t, params), 0, 2000);
    expect(
      correlation(
        a,
        samples((t) => vfWaves(t, other), 0, 2000),
      ),
    ).toBeLessThan(0.8);
    expect(
      correlation(
        a,
        samples((t) => vfWaves(t, params, 'I'), 0, 2000),
      ),
    ).toBeLessThan(0.95);
  });
});

describe('ventricular fibrillation clock', () => {
  it('draws only the fibrillation wave, and I + III = II at every moment', () => {
    const clock = createHeartClock(vf);
    for (let t = 1000; t < 6000; t += 7) {
      expect(clock.ecgAt(t)).toBeCloseTo(vfWaves(t, clock.params), 12);
      expect(clock.ecgAt(t, 'I') + clock.ecgAt(t, 'III')).toBeCloseTo(clock.ecgAt(t, 'II'), 12);
    }
  });

  it('has no sounds, no flow, the fibrillation phase and a still, unexcited 3D heart', () => {
    const clock = createHeartClock(vf);
    for (let t = 500; t < 5000; t += 50) {
      const beat = clock.beatAt(t);
      expect(beat.fibrillation).toBe(true);
      expect(soundEvents(beat)).toEqual([]);
      expect(clock.hemodynamicsAt(t).noFlow).toBe(true);
      expect(clock.sample(t).phase).toBe('fibrillation');
      const state = cycleState(clock, t);
      expect(state.phase).toBe('fibrillation');
      expect(state.excited).toEqual([]);
      expect(Object.values(state.contraction).every((c) => c === 0)).toBe(true);
      expect(Object.values(state.valveOpen).every((v) => v === 0)).toBe(true);
    }
  });

  it('leaves the normal heart unchanged: no noFlow flag, no fibrillation beats', () => {
    const clock = createHeartClock({});
    for (let t = 0; t < 3000; t += 100) {
      expect(clock.beatAt(t).fibrillation).toBe(false);
      expect(clock.hemodynamicsAt(t)).not.toHaveProperty('noFlow');
    }
  });

  it('switches into and out of fibrillation without a step', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.ecgAt(2500);
    const into = clock.setParams(vf, 2500);
    const { start } = clock.beatsBetween(2500, 6000).find((b) => b.index === into) ?? {};
    expect(start).toBeDefined();
    clock.ecgAt(start as number);
    const back = clock.setParams({ ventricularFibrillation: 0, pAmplitude: 0.15 }, 5200);
    const end = clock.beatsBetween(5200, 9000).find((b) => b.index === back)?.start;
    expect(end).toBeDefined();
    for (const lead of [undefined, 'I', 'II', 'III'] as const) {
      for (const edge of [start as number, end as number]) {
        const strip = samples((t) => clock.ecgAt(t, lead), edge - 20, edge + 20);
        for (let k = 1; k < strip.length; k += 1) {
          // The fibrillation wave changes at most ~0.03 mV per ms; a step would be far larger.
          expect(
            Math.abs((strip[k] as number) - (strip[k - 1] as number)),
            `${lead} ${edge}`,
          ).toBeLessThan(0.06);
        }
      }
    }
  });

  it('refuses fibrillation together with any rhythm, atrial or beat mode', () => {
    const base = resolveParams(vf);
    checkParams(base);
    // Each patch is valid on its own, so only the fibrillation check can refuse it.
    for (const patch of [
      { pAmplitude: 0.15 },
      { atrialContribution: 0.2 },
      { fWaveAmplitude: 0.05 },
      { flutterConduction: 2, flutterAmplitude: 0.2 },
      { rrIrregularity: 0.2 },
      { pauseEvery: 3, pauseDuration: 1000 },
      { blockedP: 1 },
      { prStep: 40 },
      { atrialRate: 60 },
      { atrialPacing: 1 },
      { ventricularPacing: 1 },
      { prematureEvery: 3 },
      { deltaWave: 0.3 },
      { bidirectional: 1 },
      { s2Split: 30 },
    ]) {
      expect(() => checkParams(resolveParams(patch, base)), JSON.stringify(patch)).toThrow(
        /^ventricularFibrillation needs/,
      );
    }
    expect(() => checkParams(resolveParams({ ventricularFibrillation: 0.5 }))).toThrow(RangeError);
  });
});
