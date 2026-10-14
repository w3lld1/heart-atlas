import type { HeartParams } from './params.ts';
import { unitGains, type LeadGains } from './leads.ts';
import { pDurationAt, type BeatTiming } from './timing.ts';

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

/** P wave lasting `pDuration` ms at `t` ms from its onset, mV. */
export function pWave(t: number, pDuration: number, params: HeartParams): number {
  return wave(t, pDuration / 2, params.pAmplitude, pDuration / 5, pDuration / 5);
}

/**
 * ECG of one beat at `t` ms from its start, mV, without f waves. A sum of Gaussians as in ECGSYN
 * (McSharry et al. 2003), placed in time by the beat timing. Values outside the beat are the tails
 * of its waves, so a caller can add the previous beat to cover a T wave that runs past RR.
 * `gains` project the beat into a limb lead (`leadGains`); by default the amplitudes are drawn as
 * they are. The shape of every wave comes from the amplitudes, so a lead only scales it.
 */
export function beatWaves(
  t: number,
  timing: BeatTiming,
  params: HeartParams,
  gains: LeadGains = unitGains,
): number {
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
  const sSigma = params.sWidth * rest;
  // A broad S moves later so that ±2.5σ stays inside the QRS; it stays after the R peak.
  const sCentre = qOnset + delta + Math.min((delta > 0 ? 0.75 : 0.8) * rest, rest - 2.5 * sSigma);
  const q = delta > 0 ? 0 : wave(t, qOnset + 0.15 * qrs, qAmplitude, 0.06 * qrs, 0.06 * qrs);
  // A QRS without Q and S waves (a ventricle excited through the muscle: pacing, a ventricular
  // premature beat) is one R wave across the whole complex: σ is chosen so that about 0.9 of it
  // stays above 0.05 mV whatever the R amplitude of the lead.
  const rSigma =
    qAmplitude === 0 && sAmplitude === 0 && delta === 0 ? wideRSigma(rAmplitude, rest) : 0.1 * rest;
  // A notch is a dip in the middle of R, a quarter of its width: R keeps two tops,
  // lower than rAmplitude because a wide R is not flat.
  const notch =
    params.rNotch === 0
      ? 1
      : 1 - params.rNotch * Math.exp(-0.5 * ((t - timing.rPeak) / (rSigma / 4)) ** 2);
  const r = wave(t, timing.rPeak, rAmplitude, rSigma, rSigma) * notch;
  // The slow rise goes on at the same slope until the steep R upstroke overtakes it, so the two
  // join without a step and R keeps its amplitude.
  const deltaRise = delta > 0 ? (deltaShare * rAmplitude * Math.max(0, t - qOnset)) / delta : 0;
  const rWithDelta = t < timing.rPeak ? Math.max(deltaRise, r) : r;
  // With P waves on their own clock (`atrialRate`, `dissociatedP`) the beat has no P wave.
  const p = params.atrialRate > 0 ? 0 : pWave(t, pDuration, params);
  const s = wave(t, sCentre, sAmplitude, sSigma, sSigma);
  return (
    gains.p * p +
    gains.qr * (q + rWithDelta) +
    gains.s * s +
    gains.t * wave(t, tCentre, params.tAmplitude, 0.12 * qt, tAfter) +
    gains.st * st
  );
}

const visibleMv = 0.05;

/** σ of an R wave that stays above 0.05 mV over 0.9 of a QRS of `qrs` ms, and not below 0.1 of it. */
function wideRSigma(rAmplitude: number, qrs: number): number {
  const a = Math.abs(rAmplitude);
  if (a <= visibleMv) return 0.1 * qrs;
  return Math.max(0.1 * qrs, (0.9 * qrs) / (2 * Math.sqrt(2 * Math.log(a / visibleMv))));
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

/** Start of the latest P wave on its own clock (`atrialRate`) at or before clock time `t`, ms. */
export function dissociatedPOnset(t: number, params: HeartParams): number {
  const period = 60000 / params.atrialRate;
  return Math.floor(t / period) * period;
}

/**
 * P waves on their own clock at absolute clock time `t`, mV (complete AV block): the beat's P wave
 * shape, one every `60000 / atrialRate` ms, unrelated to the beats. 0 when `atrialRate` is 0.
 * Spec: docs/plans/2026-10-13-heart-clock-av-block.md.
 */
export function dissociatedP(t: number, params: HeartParams): number {
  if (params.atrialRate === 0) return 0;
  const period = 60000 / params.atrialRate;
  const duration = pDurationAt(period, params);
  const onset = dissociatedPOnset(t, params);
  let value = 0;
  // The P wave ends well inside its period, so the latest wave and the tail of the one before
  // cover every moment.
  for (const start of [onset - period, onset]) {
    value += pWave(t - start, duration, params);
  }
  return value;
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
