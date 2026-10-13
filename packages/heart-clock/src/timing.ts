import { paramRanges, type HeartParams } from './params.ts';

/** Moments inside one beat, ms from the onset of the P wave. */
export interface BeatTiming {
  /** RR interval of the rhythm, ms: the beat without a sinus pause (`Beat.pause`). */
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
  'atrial-systole' | 'isovolumic-contraction' | 'ejection' | 'isovolumic-relaxation' | 'filling';

export const phases: readonly Phase[] = [
  'atrial-systole',
  'isovolumic-contraction',
  'ejection',
  'isovolumic-relaxation',
  'filling',
];

/**
 * Timing of one beat with the given RR interval.
 * QS2 and LVET: Weissler et al., Circulation 1968, regressions for men. PR, QT and IVRT scale with
 * √RR as in ECGSYN (McSharry et al. 2003). Throws RangeError when the phases do not fit the beat.
 */
export function beatTiming(rr: number, params: HeartParams): BeatTiming {
  const heartRate = 60000 / rr;
  const [minRate, maxRate] = paramRanges.heartRate;
  // A small tolerance keeps rounding in 60000 / (60000 / hr) from rejecting the range ends.
  if (!Number.isFinite(rr) || heartRate < minRate - 1e-9 || heartRate > maxRate + 1e-9) {
    throw new RangeError(`RR ${rr} ms is outside ${minRate}–${maxRate} beats per minute`);
  }
  const scale = Math.sqrt(rr / 1000);
  const qs2 = 546 - 2.1 * heartRate;
  const lvet = 413 - 1.7 * heartRate;
  // assumption: PR stops growing below 40 bpm (RR 1500 ms); otherwise a normal PR of 160 ms would
  // reach 226 ms at 30 bpm and look like first-degree AV block. No source gives PR below 40 bpm.
  const pr = params.prInterval * Math.sqrt(Math.min(rr, 1500) / 1000);
  const qOnset = pr;
  const timing: BeatTiming = {
    rr,
    // assumption: the P wave fills 60% of the PR interval.
    pDuration: 0.6 * pr,
    qOnset,
    rPeak: qOnset + params.qrsDuration / 2,
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

/** Phase at `t` ms from the start of the beat (0 ≤ t < rr). */
export function phaseAt(t: number, timing: BeatTiming): Phase {
  const starts = phaseStarts(timing);
  let index = 0;
  while (index + 1 < starts.length && t >= (starts[index + 1] ?? Infinity)) index += 1;
  return phases[index] ?? 'filling';
}
