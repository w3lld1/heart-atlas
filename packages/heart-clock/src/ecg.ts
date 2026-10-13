import type { HeartParams } from './params.ts';
import type { BeatTiming } from './timing.ts';

/** Gaussian wave with separate widths before and after its centre (the T wave is asymmetric). */
function wave(t: number, centre: number, amplitude: number, before: number, after: number): number {
  const width = t < centre ? before : after;
  const x = (t - centre) / width;
  return amplitude * Math.exp(-0.5 * x * x);
}

/** 0 below `from`, 1 above `to`, smooth in between. */
function smoothstep(from: number, to: number, t: number): number {
  const x = Math.min(1, Math.max(0, (t - from) / (to - from)));
  return x * x * (3 - 2 * x);
}

// assumption: the delta wave rises to 0.3 of R. Sources describe its shape (a slurred, slow
// upstroke), not its height.
const deltaShare = 0.3;

/**
 * ECG of one beat at `t` ms from its start, mV, without f waves. A sum of Gaussians as in ECGSYN
 * (McSharry et al. 2003), placed in time by the beat timing. Values outside the beat are the tails
 * of its waves, so a caller can add the previous beat to cover a T wave that runs past RR.
 */
export function beatWaves(t: number, timing: BeatTiming, params: HeartParams): number {
  const { pDuration, qOnset, jPoint, tEnd } = timing;
  const { qAmplitude, rAmplitude, sAmplitude } = params;
  const qrs = params.qrsDuration;
  const qt = tEnd - qOnset;
  // assumption: wave widths as fractions of the intervals they live in; ±2.5σ stays inside them.
  const tAfter = 0.07 * qt;
  const tCentre = tEnd - 2.5 * tAfter;
  // stSlope bends the plateau into a coved segment: highest at J, falling ever faster to T.
  const fall =
    params.stSlope * Math.min(1, Math.max(0, (t - jPoint) / Math.max(1, tCentre - jPoint))) ** 2;
  const st =
    params.stShift *
    smoothstep(jPoint - Math.min(15, 0.15 * qrs), jPoint, t) *
    (1 - fall) *
    (1 - smoothstep(tCentre, tEnd, t));
  // With a delta wave the QRS starts with a slow rise instead of a Q wave, and R and S fit into
  // the rest of the complex. Spec: docs/plans/2026-10-13-heart-clock-rhythms.md, section 3.
  const delta = params.deltaWave;
  const rest = qrs - delta;
  const sCentre = qOnset + delta + (delta > 0 ? 0.75 : 0.8) * rest;
  const q = delta > 0 ? 0 : wave(t, qOnset + 0.15 * qrs, qAmplitude, 0.06 * qrs, 0.06 * qrs);
  const r = wave(t, timing.rPeak, rAmplitude, 0.1 * rest, 0.1 * rest);
  // The slow rise goes on at the same slope until the steep R upstroke overtakes it, so the two
  // join without a step and R keeps its amplitude.
  const deltaRise = delta > 0 ? (deltaShare * rAmplitude * Math.max(0, t - qOnset)) / delta : 0;
  const rWithDelta = t < timing.rPeak ? Math.max(deltaRise, r) : r;
  return (
    wave(t, pDuration / 2, params.pAmplitude, pDuration / 5, pDuration / 5) +
    q +
    rWithDelta +
    wave(t, sCentre, sAmplitude, 0.07 * rest, 0.07 * rest) +
    wave(t, tCentre, params.tAmplitude, 0.12 * qt, tAfter) +
    st
  );
}

/**
 * Atrial fibrillation f waves at absolute clock time `t`, mV. Two incommensurate sines make the
 * baseline look irregular while staying continuous across beats.
 */
export function fWaves(t: number, params: HeartParams): number {
  if (params.fWaveAmplitude === 0) return 0;
  const phase = (2 * Math.PI * params.fWaveFrequency * t) / 1000;
  return params.fWaveAmplitude * (0.6 * Math.sin(phase) + 0.4 * Math.sin(1.37 * phase + 1));
}

/** Share of an F wave taken by its slow fall; the rest is the quick rise. assumption. */
const flutterFall = 0.8;

/**
 * Atrial flutter F waves at `t` ms from the start of a beat, mV: a sawtooth with a slow fall and a
 * quick rise, `flutterConduction` waves per rhythm RR, so the phase meets itself at every beat.
 * Spec: docs/plans/2026-10-13-heart-clock-rhythms.md, section 5.
 */
export function flutterWaves(t: number, timing: BeatTiming, params: HeartParams): number {
  const n = params.flutterConduction;
  if (n === 0) return 0;
  const phase = (t * n) / timing.rr;
  const x = phase - Math.floor(phase);
  const amplitude = params.flutterAmplitude;
  return x < flutterFall
    ? amplitude * (0.5 - x / flutterFall)
    : amplitude * (-0.5 + (x - flutterFall) / (1 - flutterFall));
}
