import { paramRanges, type HeartParams } from './params.ts';

/** Moments inside one beat, ms from the onset of the P wave. */
export interface BeatTiming {
  /** RR interval of the rhythm, ms: the beat without a pause after it (`Beat.pause`). */
  rr: number;
  pDuration: number;
  qOnset: number;
  /** R peak; the model closes the mitral valve here (S1). */
  rPeak: number;
  /** End of the QRS complex (J point). */
  jPoint: number;
  /** Aortic valve opens. */
  ejectionStart: number;
  /** Aortic valve closes (S2). */
  aorticClosure: number;
  mitralOpening: number;
  tEnd: number;
}

export type Phase =
  | 'atrial-systole'
  | 'isovolumic-contraction'
  | 'ejection'
  | 'isovolumic-relaxation'
  | 'filling'
  /** Ventricular fibrillation: no cycle (`ventricularFibrillation`); not in `phases`. */
  | 'fibrillation';

/** Phases of a beat, in order; `phaseStarts` gives their starts. */
export const phases: readonly Exclude<Phase, 'fibrillation'>[] = [
  'atrial-systole',
  'isovolumic-contraction',
  'ejection',
  'isovolumic-relaxation',
  'filling',
];

/**
 * PR interval at this RR, ms. assumption: PR stops growing below 40 bpm (RR 1500 ms); otherwise a
 * normal PR of 160 ms would reach 226 ms at 30 bpm and look like first-degree AV block. No source
 * gives PR below 40 bpm.
 */
export function prAt(rr: number, params: HeartParams): number {
  return params.prInterval * Math.sqrt(Math.min(rr, 1500) / 1000);
}

/** P wave duration at this RR, ms. assumption: the P wave fills 60% of the PR interval. */
export function pDurationAt(rr: number, params: HeartParams): number {
  return 0.6 * prAt(rr, params);
}

/**
 * Timing of one beat with the given RR interval.
 * QS2 and LVET: Weissler et al., Circulation 1968, regressions for men. PR, QT and IVRT scale with
 * √RR as in ECGSYN (McSharry et al. 2003). `prExtra` lengthens the PR by that many ms (`prStep`,
 * Mobitz I); the QRS and everything after it move with it. Throws RangeError when the phases do
 * not fit the beat.
 */
export function beatTiming(rr: number, params: HeartParams, prExtra = 0): BeatTiming {
  const heartRate = 60000 / rr;
  const [minRate, maxRate] = paramRanges.heartRate;
  // A small tolerance keeps rounding in 60000 / (60000 / hr) from rejecting the range ends.
  if (!Number.isFinite(rr) || heartRate < minRate - 1e-9 || heartRate > maxRate + 1e-9) {
    throw new RangeError(`RR ${rr} ms is outside ${minRate}–${maxRate} beats per minute`);
  }
  const scale = Math.sqrt(rr / 1000);
  const qs2 = 546 - 2.1 * heartRate;
  const lvet = 413 - 1.7 * heartRate;
  const pr = prAt(rr, params);
  const qOnset = pr + prExtra;
  const timing: BeatTiming = {
    rr,
    pDuration: pDurationAt(rr, params),
    qOnset,
    // A delta wave takes the start of the QRS; R then rises at once and peaks early in the rest
    // of the complex (ecg.ts). Without one, R is in the middle of the QRS.
    rPeak:
      qOnset +
      (params.deltaWave > 0
        ? params.deltaWave + 0.35 * (params.qrsDuration - params.deltaWave)
        : params.qrsDuration / 2),
    jPoint: qOnset + params.qrsDuration,
    ejectionStart: qOnset + (qs2 - lvet),
    aorticClosure: qOnset + qs2,
    mitralOpening: qOnset + qs2 + params.ivrt * scale,
    tEnd: qOnset + params.qtc * scale,
  };
  const order = [
    timing.rPeak,
    timing.ejectionStart,
    timing.aorticClosure,
    timing.mitralOpening,
    // assumption: at least 10 ms of filling, so every phase is visible.
    timing.rr - 10,
  ];
  if (order.some((t, i) => i > 0 && t <= (order[i - 1] ?? 0)) || timing.tEnd >= rr) {
    throw new RangeError(
      `Cardiac cycle phases do not fit an RR of ${Math.round(rr)} ms with these parameters`,
    );
  }
  return timing;
}

/** Start of each phase inside the beat, in the order of `phases`. */
export function phaseStarts(timing: BeatTiming): readonly number[] {
  return [0, timing.rPeak, timing.ejectionStart, timing.aorticClosure, timing.mitralOpening];
}

/**
 * Phase at `t` ms from the start of the beat (0 ≤ t < rr). With P waves on their own clock
 * (`atrialRate`), or a beat whose QRS starts at once (a ventricular premature beat), the atria do
 * not contract with the beat, so its start is still filling.
 */
export function phaseAt(t: number, timing: BeatTiming, params: HeartParams): Phase {
  if (params.ventricularFibrillation === 1) return 'fibrillation';
  const starts = phaseStarts(timing);
  let index = 0;
  while (index + 1 < starts.length && t >= (starts[index + 1] ?? Infinity)) index += 1;
  const phase = phases[index] ?? 'filling';
  return phase === 'atrial-systole' && (params.atrialRate > 0 || timing.qOnset === 0)
    ? 'filling'
    : phase;
}
