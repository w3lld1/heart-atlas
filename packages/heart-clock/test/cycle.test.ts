import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { cycleState } from '../src/cycle.ts';
import {
  publishCycleSource,
  subscribeCycleSource,
  withdrawCycleSource,
  type CycleSource,
  type CycleState,
} from '../src/cycle-source.ts';
import { presetParams, type PresetId } from '../src/presets.ts';

const rate = 60;

/** States over one beat at 1 ms steps, from the second beat so the first has a real previous. */
function beat(id: PresetId) {
  const clock = createHeartClock({ ...presetParams(id), heartRate: rate });
  const start = clock.beatAt(1000).start;
  const { timing } = clock.beatAt(start);
  const states: { t: number; state: CycleState }[] = [];
  for (let t = 0; t < timing.rr; t += 1) states.push({ t, state: cycleState(clock, start + t) });
  return { clock, start, timing, states };
}

describe('cycleState', () => {
  it('follows the conduction system and the valves through a normal beat', () => {
    const { clock, start, timing } = beat('normal');
    const at = (t: number) => cycleState(clock, start + t);
    expect(at(1).excited).toEqual(['sa-node']);
    expect(at((timing.pDuration + timing.qOnset) / 2).excited).toEqual([
      'av-node',
      'bundle-of-his',
    ]);
    expect(at(timing.qOnset + 1).excited).toEqual([
      'right-bundle-branch',
      'left-bundle-branch',
      'purkinje-fibers',
    ]);
    expect(at(timing.jPoint + 1).excited).toEqual([]);

    const open = (t: number) =>
      Object.entries(at(t).valveOpen)
        .filter(([, v]) => v === 1)
        .map(([id]) => id)
        .sort();
    expect(open(1)).toEqual(['mitral-valve', 'tricuspid-valve']);
    expect(open((timing.rPeak + timing.ejectionStart) / 2)).toEqual([]);
    expect(open(timing.ejectionStart + 1)).toEqual(['aortic-valve', 'pulmonary-valve']);
    expect(open((timing.aorticClosure + timing.mitralOpening) / 2)).toEqual([]);
    expect(open(timing.mitralOpening + 1)).toEqual(['mitral-valve', 'tricuspid-valve']);
  });

  it('squeezes the ventricles by the ejection fraction and less in heart failure', () => {
    const maxSqueeze = (id: PresetId) =>
      Math.max(...beat(id).states.map(({ state }) => state.contraction['left-ventricle']));
    const normal = beat('normal');
    const at = (t: number) => cycleState(normal.clock, normal.start + t);
    expect(at(normal.timing.ejectionStart).contraction['left-ventricle']).toBeCloseTo(0, 6);
    expect(at(normal.timing.aorticClosure).contraction['left-ventricle']).toBeCloseTo(
      presetParams('normal').ejectionFraction,
      6,
    );
    expect(maxSqueeze('heart-failure')).toBeCloseTo(
      presetParams('heart-failure').ejectionFraction,
      6,
    );
    expect(maxSqueeze('heart-failure')).toBeLessThan(maxSqueeze('normal'));
  });

  it('squeezes the atria with the a wave, and never in atrial fibrillation', () => {
    const atria = (id: PresetId) =>
      beat(id).states.map(({ state }) => state.contraction['left-atrium']);
    const normal = atria('normal');
    expect(Math.min(...normal)).toBe(0);
    expect(Math.max(...normal)).toBeCloseTo(1, 2);
    expect(Math.max(...atria('atrial-fibrillation'))).toBe(0);
    expect(
      beat('atrial-fibrillation').states.some(({ state }) => state.excited.includes('sa-node')),
    ).toBe(false);
  });

  it('closes the pulmonary valve s2Split after the aortic valve in atrial septal defect', () => {
    const { clock, start, timing } = beat('atrial-septal-defect');
    const split = presetParams('atrial-septal-defect').s2Split;
    const at = (t: number) => cycleState(clock, start + t).valveOpen;
    expect(at(timing.aorticClosure + split / 2)).toMatchObject({
      'aortic-valve': 0,
      'pulmonary-valve': 1,
    });
    expect(at(timing.aorticClosure + split + 1)['pulmonary-valve']).toBe(0);
  });

  it('changes the discrete state at most eight times a beat and has no jumps across beats', () => {
    for (const id of ['normal', 'atrial-fibrillation', 'heart-failure'] as const) {
      const { clock, start, timing, states } = beat(id);
      const key = ({ state }: { state: CycleState }) =>
        JSON.stringify([state.phase, state.excited, state.valveOpen]);
      const keys = states.map(key);
      const changes = keys.filter((k, i) => i > 0 && k !== keys[i - 1]).length;
      expect(changes, id).toBeLessThanOrEqual(8);
      // Contraction is continuous where one beat hands over to the next.
      const end = cycleState(clock, start + timing.rr - 0.01).contraction;
      const next = cycleState(clock, start + timing.rr).contraction;
      for (const chamber of Object.keys(end) as (keyof typeof end)[]) {
        expect(Math.abs(end[chamber] - next[chamber]), `${id} ${chamber}`).toBeLessThan(0.01);
      }
    }
  });
});

describe('cycleState edge cases', () => {
  it('keeps the atria continuous with a small atrial contribution', () => {
    const clock = createHeartClock({ atrialContribution: 0.02, heartRate: rate });
    const start = clock.beatAt(1000).start;
    const before = cycleState(clock, start - 0.01).contraction['left-atrium'];
    const after = cycleState(clock, start).contraction['left-atrium'];
    expect(Math.abs(after - before)).toBeLessThan(0.01);
  });

  it('keeps the pulmonary valve open into the next beat when the split outlasts it', () => {
    const clock = createHeartClock({ s2Split: 100, heartRate: 180 });
    const beat = clock.beatAt(1000);
    expect(beat.timing.aorticClosure + 100).toBeGreaterThan(beat.rr);
    const next = beat.start + beat.rr;
    expect(cycleState(clock, next + 1).valveOpen['pulmonary-valve']).toBe(1);
    expect(
      cycleState(clock, beat.start + beat.timing.aorticClosure + 100 + 1).valveOpen[
        'pulmonary-valve'
      ],
    ).toBe(0);
  });
});

describe('cycleState after a jump in time', () => {
  it('does not throw when the previous beat is no longer kept', () => {
    const clock = createHeartClock({ heartRate: rate });
    cycleState(clock, 1000);
    expect(() => cycleState(clock, 60000)).not.toThrow();
    expect(cycleState(clock, 60000).phase).toBe(clock.sample(60000).phase);
  });
});

describe('cycle source', () => {
  it('hands the current source to a late subscriber and follows changes', () => {
    const source: CycleSource = () => null;
    const other: CycleSource = () => null;
    publishCycleSource(source);
    const seen: (CycleSource | null)[] = [];
    const unsubscribe = subscribeCycleSource((s) => seen.push(s));
    publishCycleSource(other);
    // A stale island does not clear the newer source.
    withdrawCycleSource(source);
    withdrawCycleSource(other);
    unsubscribe();
    publishCycleSource(source);
    expect(seen).toEqual([source, other, null]);
    publishCycleSource(null);
  });
});
