import type { Beat } from './clock.ts';
import { gradientPeakAt, gradientPeakPerMean, gradientShape } from './valve.ts';

/** Pressures (mmHg) and left ventricular volume (% of end-diastolic volume) at one moment. */
export interface Hemodynamics {
  lv: number;
  aorta: number;
  la: number;
  /** Left ventricular volume, % of end-diastolic volume. */
  volume: number;
}

type Keyframe = readonly [time: number, value: number];

/**
 * Monotone cubic curve through keyframes (Fritsch–Carlson): no overshoot between keyframes, and
 * it keeps its slope through a keyframe instead of flattening there.
 */
function through(t: number, keys: readonly Keyframe[]): number {
  const n = keys.length;
  const first = keys[0] as Keyframe;
  const last = keys[n - 1] as Keyframe;
  if (t <= first[0]) return first[1];
  if (t >= last[0]) return last[1];
  let i = 1;
  while ((keys[i] as Keyframe)[0] < t) i += 1;
  const secant = (k: number) => {
    const [t0, v0] = keys[k] as Keyframe;
    const [t1, v1] = keys[k + 1] as Keyframe;
    return t1 === t0 ? 0 : (v1 - v0) / (t1 - t0);
  };
  const tangent = (k: number) => {
    if (k === 0) return secant(0);
    if (k === n - 1) return secant(n - 2);
    const a = secant(k - 1);
    const b = secant(k);
    // Flat at a local extremum; otherwise the harmonic mean keeps the curve monotone.
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  };
  const [t0, v0] = keys[i - 1] as Keyframe;
  const [t1, v1] = keys[i] as Keyframe;
  const h = t1 - t0;
  if (h === 0) return v1;
  const x = (t - t0) / h;
  const m0 = tangent(i - 1) * h;
  const m1 = tangent(i) * h;
  const x2 = x * x;
  const x3 = x2 * x;
  return (
    (2 * x3 - 3 * x2 + 1) * v0 + (x3 - 2 * x2 + x) * m0 + (-2 * x3 + 3 * x2) * v1 + (x3 - x2) * m1
  );
}

// assumption: the shapes below are a schematic Wiggers diagram. Only 120/80 mmHg and the
// ejection fraction come from a source (StatPearls, "Physiology, Cardiac Cycle"); the other
// levels are fractions of the end-diastolic pressure chosen so that each valve opens and closes
// on the right pressure difference: the mitral valve is open while LA ≥ LV (from mitral opening
// to the R peak), the aortic valve while the aorta follows the ventricle (lower by the valve's
// drop when the valve is stenotic). Named choices: the aortic valve closes at 70% of the way from
// diastolic to systolic aortic pressure; the dicrotic notch is 4 mmHg deep, 15 ms after closure.

/** Peak pressure drop across the aortic valve: its mean is `aorticValveGradient`. */
function aorticPeakDrop(beat: Beat): number {
  return beat.params.aorticValveGradient * gradientPeakPerMean;
}

/** Peak aortic pressure: the LV peak less the valve's drop at that moment. */
function aorticSystolic(beat: Beat): number {
  return beat.params.lvSystolic - aorticPeakDrop(beat);
}

/** Pressure in the aorta, and in the ventricle, when the aortic valve closes. */
function closurePressure(beat: Beat): number {
  const { aorticDiastolic } = beat.params;
  return aorticDiastolic + 0.7 * (aorticSystolic(beat) - aorticDiastolic);
}

/**
 * LV pressure at the very start of a beat (diastasis). Atrial contraction raises it to the
 * end-diastolic pressure; without it (atrialContribution 0) the ventricle is already there.
 */
function startLv(beat: Beat): number {
  const { lvEndDiastolic: edp, atrialContribution } = beat.params;
  return edp * (1 - 2.5 * atrialContribution);
}

/**
 * LA pressure at the start of a beat: a little above LV, since the mitral valve is open. A beat
 * whose QRS starts at once (a ventricular premature beat) has no time before the QRS, so LA
 * starts where it meets LV at the end of diastole.
 */
function startLa(beat: Beat): number {
  if (beat.timing.qOnset === 0) return beat.params.lvEndDiastolic;
  return startLv(beat) + 0.1 * beat.params.lvEndDiastolic;
}

/** Volume before atrial contraction, % of end-diastolic volume. */
function startVolume(beat: Beat): number {
  const { ejectionFraction, atrialContribution } = beat.params;
  return 100 - atrialContribution * ejectionFraction * 100;
}

/**
 * LV pressure without the valve's drop: during ejection this is the aortic pressure, and the
 * ventricle is higher by `valveGradient`. With a normal valve the two are the same.
 */
function basePressure(t: number, beat: Beat, next: Beat): number {
  const { timing } = beat;
  const { aorticDiastolic, lvEndDiastolic: edp } = beat.params;
  const lvet = timing.aorticClosure - timing.ejectionStart;
  const filling = timing.rr - timing.mitralOpening;
  return through(t, [
    [0, startLv(beat)],
    [timing.qOnset, edp],
    [timing.rPeak, edp],
    [timing.ejectionStart, aorticDiastolic],
    [timing.ejectionStart + gradientPeakAt * lvet, aorticSystolic(beat)],
    [timing.aorticClosure, closurePressure(beat)],
    [timing.mitralOpening, 0.9 * edp],
    [timing.mitralOpening + 0.3 * filling, 0.3 * edp],
    [timing.rr, startLv(next)],
  ]);
}

function laPressure(t: number, beat: Beat, next: Beat): number {
  const { timing } = beat;
  const edp = beat.params.lvEndDiastolic;
  const lvet = timing.aorticClosure - timing.ejectionStart;
  const filling = timing.rr - timing.mitralOpening;
  // a wave: atrial contraction lifts LA above the end-diastolic pressure; LA then meets LV at
  // the R peak, where the mitral valve closes.
  return through(t, [
    [0, startLa(beat)],
    [timing.qOnset, edp * (1 + beat.params.atrialContribution)],
    [timing.rPeak, edp],
    [timing.ejectionStart, 0.8 * edp],
    [timing.ejectionStart + 0.3 * lvet, 0.4 * edp],
    [timing.mitralOpening, 0.9 * edp],
    [timing.mitralOpening + 0.3 * filling, 0.5 * edp],
    [timing.rr, startLa(next)],
  ]);
}

function volume(t: number, beat: Beat, next: Beat): number {
  const { timing } = beat;
  const esv = 100 * (1 - beat.params.ejectionFraction);
  if (t < timing.ejectionStart) {
    return through(t, [
      [0, startVolume(beat)],
      [timing.qOnset, 100],
    ]);
  }
  if (t < timing.aorticClosure) {
    // Faster at the start of ejection (ease-out).
    const x = (t - timing.ejectionStart) / (timing.aorticClosure - timing.ejectionStart);
    return 100 - (100 - esv) * (1 - (1 - x) ** 2);
  }
  if (t < timing.mitralOpening) return esv;
  // Rapid filling, then diastasis (ease-out cubic). In a pause (after timing.rr: a sinus pause or a
  // blocked P wave) the volume stays where the next beat starts.
  const x = Math.min(1, (t - timing.mitralOpening) / (timing.rr - timing.mitralOpening));
  return esv + (startVolume(next) - esv) * (1 - (1 - x) ** 3);
}

/**
 * Aortic pressure after the aortic valve of `beat` closes: a dicrotic notch, then exponential
 * run-off that reaches the next beat's diastolic pressure when its aortic valve opens.
 * `tau` is the time since closure.
 */
function aorticRunoff(tau: number, beat: Beat, next: Beat): number {
  const from = closurePressure(beat);
  const to = next.params.aorticDiastolic;
  const span = beat.rr - beat.timing.aorticClosure + next.timing.ejectionStart;
  const k = span / 2;
  const decay = (Math.exp(-tau / k) - Math.exp(-span / k)) / (1 - Math.exp(-span / k));
  const notchAt = 15;
  const notch = 4 * (tau / notchAt) * Math.exp(1 - tau / notchAt);
  // The notch fades out before the run-off ends, so the curve lands exactly on `to`.
  return to + (from - to) * decay - notch * (1 - tau / span);
}

/** Pressure drop across the aortic valve at `t` ms into the beat; 0 outside ejection. */
function valveGradient(t: number, beat: Beat): number {
  const { ejectionStart, aorticClosure } = beat.timing;
  if (t <= ejectionStart || t >= aorticClosure) return 0;
  const x = (t - ejectionStart) / (aorticClosure - ejectionStart);
  return aorticPeakDrop(beat) * gradientShape(x);
}

/**
 * Pressures and volume at `t` ms into `beat`. `previous` and `next` are the neighbouring beats:
 * aortic pressure before this beat's ejection is the run-off of the previous beat, and every
 * curve ends at the next beat's starting value, so a parameter change does not step.
 */
export function hemodynamics(t: number, beat: Beat, previous: Beat, next: Beat): Hemodynamics {
  const { timing } = beat;
  const base = basePressure(t, beat, next);
  const lv = base + valveGradient(t, beat);
  let aorta: number;
  if (t < timing.ejectionStart) {
    aorta = aorticRunoff(t + previous.rr - previous.timing.aorticClosure, previous, beat);
  } else if (t < timing.aorticClosure) {
    aorta = base;
  } else {
    // The closed aortic valve keeps the aorta at or above the ventricle.
    aorta = Math.max(lv, aorticRunoff(t - timing.aorticClosure, beat, next));
  }
  return { lv, aorta, la: laPressure(t, beat, next), volume: volume(t, beat, next) };
}
