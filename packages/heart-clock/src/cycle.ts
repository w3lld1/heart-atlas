import type { Beat, HeartClock } from './clock.ts';
import type { CycleState } from './cycle-source.ts';
import { dissociatedPOnset } from './ecg.ts';
import { pDurationAt, phaseAt } from './timing.ts';

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
  const phase = phaseAt(tInBeat, timing, params);
  const { volume, la } = clock.hemodynamicsAt(t);

  const excited: string[] = [];
  const dissociated = params.atrialRate > 0;
  const inQrs = tInBeat >= timing.qOnset && tInBeat < timing.jPoint;
  // StatPearls ECG: P is atrial depolarization; an inverted or absent P is not sinus rhythm. A
  // paced P starts at the pacemaker lead, not at the sinus node. P waves on their own clock
  // (complete AV block) light the node when they come, not at the start of the beat.
  const inP = dissociated
    ? t - dissociatedPOnset(t, params) < pDurationAt(60000 / params.atrialRate, params)
    : tInBeat < timing.pDuration;
  if (inP && params.pAmplitude > 0 && params.atrialPacing === 0) excited.push('sa-node');
  // StatPearls ECG: the PR interval includes the AV node delay. His bundle with it: assumption. In
  // complete AV block no atrial impulse passes; with ventricular pacing the pacemaker counts the
  // delay.
  if (
    !dissociated &&
    params.ventricularPacing === 0 &&
    tInBeat >= timing.pDuration &&
    tInBeat < timing.qOnset
  ) {
    excited.push('av-node', 'bundle-of-his');
  }
  // assumption: the escape rhythm of complete AV block with a narrow QRS starts in the AV junction
  // (StatPearls, Third-Degree AV Block); the model lights the His bundle with the QRS.
  if (dissociated && inQrs) excited.push('bundle-of-his');
  // StatPearls ECG: QRS is ventricular depolarization. A paced ventricle is excited from the lead
  // through the muscle, not through the bundle branches (assumption: the model shows no lead).
  if (inQrs && params.ventricularPacing === 0) {
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
  const previous = beat.index > 0 ? keptBeat(clock, beat.start - 1) : undefined;
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

/** The beat at `t`, or undefined when the clock no longer keeps it (after a jump in time). */
function keptBeat(clock: HeartClock, t: number): Beat | undefined {
  try {
    return clock.beatAt(t);
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
