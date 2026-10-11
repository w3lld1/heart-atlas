import type { HeartClock } from './clock.ts';
import type { CycleState } from './cycle-source.ts';
import { phaseAt } from './timing.ts';

/**
 * State of the heart at clock time `t` for the 3D model. Everything comes from the beat timing
 * and the same volume and pressure curves as the Wiggers diagram; the right heart follows the
 * left (assumption: the clock models the left heart only).
 * Spec: docs/plans/2026-10-11-stage-2-cycle-sync.md.
 */
export function cycleState(clock: HeartClock, t: number): CycleState {
  const beat = clock.beatAt(t);
  const { timing, params } = beat;
  const tInBeat = t - beat.start;
  const phase = phaseAt(tInBeat, timing);
  const { volume, la } = clock.hemodynamicsAt(t);

  const excited: string[] = [];
  // StatPearls ECG: P is atrial depolarization; an inverted or absent P is not sinus rhythm.
  if (tInBeat < timing.pDuration && params.pAmplitude > 0) excited.push('sa-node');
  // StatPearls ECG: the PR interval includes the AV node delay. His bundle with it: assumption.
  if (tInBeat >= timing.pDuration && tInBeat < timing.qOnset) {
    excited.push('av-node', 'bundle-of-his');
  }
  // StatPearls ECG: QRS is ventricular depolarization.
  if (tInBeat >= timing.qOnset && tInBeat < timing.jPoint) {
    excited.push('right-bundle-branch', 'left-bundle-branch', 'purkinje-fibers');
  }

  // Chamber size: share of the end-diastolic volume that has left the ventricle.
  const ventricles = clamp01(1 - volume / 100);
  // The a wave: the rise of LA pressure from where this beat starts to its peak at the Q onset
  // (lvEndDiastolic · (1 + atrialContribution)). 0 when atria do not contribute (AF).
  const aBase = Math.max(params.lvEndDiastolic, clock.hemodynamicsAt(beat.start).la);
  const aRise = params.lvEndDiastolic * (1 + params.atrialContribution) - aBase;
  const atria = phase === 'atrial-systole' && aRise > 0 ? clamp01((la - aBase) / aRise) : 0;

  const atrioventricular = phase === 'atrial-systole' || phase === 'filling' ? 1 : 0;
  const aortic = phase === 'ejection' ? 1 : 0;
  // The pulmonary valve closes s2Split later, with the P2 sound; a long split can carry the
  // previous beat's closure past the start of this one.
  const previous = beat.index > 0 ? clock.beatAt(beat.start - 1) : undefined;
  const pulmonary =
    (tInBeat >= timing.ejectionStart && tInBeat < timing.aorticClosure + params.s2Split) ||
    (previous !== undefined &&
      t - previous.start < previous.timing.aorticClosure + previous.params.s2Split)
      ? 1
      : 0;

  return {
    phase,
    excited,
    contraction: {
      'right-atrium': atria,
      'left-atrium': atria,
      'right-ventricle': ventricles,
      'left-ventricle': ventricles,
    },
    valveOpen: {
      'tricuspid-valve': atrioventricular,
      'mitral-valve': atrioventricular,
      'pulmonary-valve': pulmonary,
      'aortic-valve': aortic,
    },
  };
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
