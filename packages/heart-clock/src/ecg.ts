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

// assumption: Q, R and S amplitudes; R = 1 mV sets the scale.
const qAmplitude = -0.1;
const rAmplitude = 1;
const sAmplitude = -0.25;
// assumption: the delta wave rises to 0.3 of R. Sources describe its shape (a slurred, slow
// upstroke), not its height.
const deltaAmplitude = 0.3 * rAmplitude;

/**
 * ECG of one beat at `t` ms from its start, mV, without f waves. A sum of Gaussians as in ECGSYN
 * (McSharry et al. 2003), placed in time by the beat timing. Values outside the beat are the tails
 * of its waves, so a caller can add the previous beat to cover a T wave that runs past RR.
 */
export function beatWaves(t: number, timing: BeatTiming, params: HeartParams): number {
  const { pDuration, qOnset, jPoint, tEnd } = timing;
  const qrs = params.qrsDuration;
  const qt = tEnd - qOnset;
  // assumption: wave widths as fractions of the intervals they live in; ±2.5σ stays inside them.
  const tAfter = 0.07 * qt;
  const tCentre = tEnd - 2.5 * tAfter;
  const st =
    params.stShift *
    smoothstep(jPoint - Math.min(15, 0.15 * qrs), jPoint, t) *
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
  const deltaRise = delta > 0 ? (deltaAmplitude * Math.max(0, t - qOnset)) / delta : 0;
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
