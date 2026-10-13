import { gradientPeakPerMean } from './valve.ts';

/**
 * Parameters of the heart clock. Units: ms, mV, beats per minute.
 * Sources and model assumptions: docs/plans/2026-10-11-stage-2-heart-clock.md.
 */
export interface HeartParams {
  /** Mean heart rate, beats per minute. */
  heartRate: number;
  /** Beat-to-beat RR spread as a fraction of the mean RR (atrial fibrillation). */
  rrIrregularity: number;
  /** Seed of the RR generator, so irregular rhythms are reproducible. */
  seed: number;
  /** PR interval at 60 bpm, ms. Scales with √RR. */
  prInterval: number;
  /** QRS duration, ms. Does not depend on heart rate. */
  qrsDuration: number;
  /** QT interval at 60 bpm (QTc), ms. Scales with √RR. */
  qtc: number;
  /** Isovolumic relaxation time at 60 bpm, ms. Scales with √RR. */
  ivrt: number;
  /** P wave amplitude, mV. 0 removes the P wave. */
  pAmplitude: number;
  /** T wave amplitude, mV. Negative inverts the T wave. */
  tAmplitude: number;
  /** ST segment shift from the J point to the end of T, mV. */
  stShift: number;
  /** Amplitude of atrial fibrillation f waves, mV. 0 turns them off. */
  fWaveAmplitude: number;
  /** Frequency of f waves, Hz. */
  fWaveFrequency: number;
  /**
   * Peak left ventricular systolic pressure, mmHg. The aortic peak is the same with a normal
   * valve and lower by the valve's peak drop with `aorticValveGradient`.
   */
  lvSystolic: number;
  /** Aortic diastolic pressure, mmHg. */
  aorticDiastolic: number;
  /** Left ventricular end-diastolic pressure, mmHg. Sets the left atrial pressure too. */
  lvEndDiastolic: number;
  /** Ejection fraction, 0–1. */
  ejectionFraction: number;
  /** Share of ventricular filling that comes from atrial contraction, 0–1. 0 in AF. */
  atrialContribution: number;
  /**
   * Mean systolic pressure gradient across the aortic valve during ejection, mmHg. 0 for a
   * normal valve; aortic stenosis raises it, and the aorta then stays below the ventricle.
   */
  aorticValveGradient: number;
  /**
   * Split of the second heart sound, ms: the pulmonary component follows the aortic one by this
   * much on every beat (a fixed split, as in atrial septal defect). 0 plays a single S2. At high
   * heart rates P2 may fall after the mitral valve opens; the model does not prevent that.
   */
  s2Split: number;
  /**
   * Sinus pauses: after every `pauseEvery`-th beat the sinus node stays silent for
   * `pauseDuration` ms, with no P wave and no QRS. 0 turns pauses off; otherwise 2–20.
   */
  pauseEvery: number;
  /** Length of a sinus pause, ms. 0 exactly when `pauseEvery` is 0. */
  pauseDuration: number;
  /**
   * Delta wave (ventricular pre-excitation), ms: the QRS starts with a slow rise this long instead
   * of a Q wave, and the R peak moves later. 0 draws the usual QRS. At most half of `qrsDuration`.
   */
  deltaWave: number;
  /** Q wave amplitude, mV (0 or negative). */
  qAmplitude: number;
  /** R wave amplitude, mV. */
  rAmplitude: number;
  /** S wave amplitude, mV (0 or negative). */
  sAmplitude: number;
  /**
   * Shape of `stShift`: 0 keeps the shift as a plateau up to the T wave; 1 makes it highest at the
   * J point and lets it fall in a convex (coved) curve to nothing at the T wave's centre.
   */
  stSlope: number;
  /**
   * Atrial flutter with fixed N:1 conduction: N sawtooth F waves in every beat, so the F waves
   * run at N times the ventricular rate. 0 turns flutter off; otherwise 2–4.
   */
  flutterConduction: number;
  /** Peak-to-peak size of the F waves, mV. 0 exactly when `flutterConduction` is 0. */
  flutterAmplitude: number;
  /**
   * Atrial pacing: 1 starts every beat with a pacemaker stimulus that the atria capture, drawn as a
   * spike where the P wave begins (`clock.beatsBetween`, ecg-canvas.ts); 0 is the sinus node.
   * Spec: docs/plans/2026-10-13-heart-clock-after-treatment.md.
   */
  atrialPacing: number;
  /**
   * P waves on their own clock, beats per minute: above 0 the P waves run at this rate on the
   * clock's absolute time, unrelated to the beats, and a beat is a QRS without a P wave of its own
   * (complete AV block). 0 keeps the P wave in the beat. Spec: docs/plans/2026-10-13-heart-clock-av-block.md.
   */
  atrialRate: number;
  /**
   * Ventricular pacing: 1 starts every QRS with a pacemaker stimulus that the ventricles capture,
   * drawn as a spike at the QRS onset (ecg-canvas.ts); the preset gives the wide QRS. 0 is
   * conduction through the AV node. Spec: docs/plans/2026-10-13-heart-clock-av-block.md.
   */
  ventricularPacing: number;
}

// assumption: defaults are model choices inside the normal ranges of StatPearls "Electrocardiogram"
// (PR 120–200 ms, QRS 60–100 ms, QT under 400–440 ms, T between 1/8 and 2/3 of R with R = 1 mV).
export const defaultParams: Readonly<HeartParams> = Object.freeze({
  heartRate: 75,
  rrIrregularity: 0,
  seed: 1,
  prInterval: 160,
  qrsDuration: 90,
  qtc: 400,
  ivrt: 80,
  pAmplitude: 0.15,
  tAmplitude: 0.3,
  stShift: 0,
  fWaveAmplitude: 0,
  fWaveFrequency: 6,
  // 120/80 mmHg: StatPearls "Physiology, Cardiac Cycle". EF above 60% is normal there; 0.65 is
  // a model choice. assumption: end-diastolic pressure 10 mmHg (StatPearls lists 15 as the LV
  // minimum, which would leave no gradient for filling from an atrium at 10) and atrial share 0.2.
  // A future AF preset sets atrialContribution to 0.
  lvSystolic: 120,
  aorticDiastolic: 80,
  lvEndDiastolic: 10,
  ejectionFraction: 0.65,
  atrialContribution: 0.2,
  aorticValveGradient: 0,
  s2Split: 0,
  pauseEvery: 0,
  pauseDuration: 0,
  deltaWave: 0,
  // assumption: Q, R and S amplitudes; R = 1 mV sets the scale (lead II).
  qAmplitude: -0.1,
  rAmplitude: 1,
  sAmplitude: -0.25,
  stSlope: 0,
  flutterConduction: 0,
  flutterAmplitude: 0,
  atrialPacing: 0,
  atrialRate: 0,
  ventricularPacing: 0,
});

/** Inclusive [min, max] for every parameter. */
export const paramRanges: Readonly<Record<keyof HeartParams, readonly [number, number]>> = {
  // assumption: below 40 bpm the phase timing extrapolates the Weissler regressions (timing.ts).
  // Only presets with their own rate floor offer rates below 40 (`defaultRateLimits`).
  heartRate: [30, 180],
  rrIrregularity: [0, 0.3],
  seed: [0, 0xffffffff],
  prInterval: [80, 300],
  qrsDuration: [40, 200],
  qtc: [250, 600],
  ivrt: [30, 150],
  pAmplitude: [-0.5, 0.5],
  tAmplitude: [-1, 1],
  stShift: [-0.5, 0.5],
  fWaveAmplitude: [0, 0.3],
  fWaveFrequency: [4, 10],
  lvSystolic: [70, 260],
  aorticDiastolic: [30, 130],
  lvEndDiastolic: [3, 40],
  ejectionFraction: [0.1, 0.85],
  atrialContribution: [0, 0.4],
  aorticValveGradient: [0, 100],
  s2Split: [0, 100],
  pauseEvery: [0, 20],
  pauseDuration: [0, 6000],
  deltaWave: [0, 80],
  qAmplitude: [-0.5, 0],
  rAmplitude: [0.1, 2],
  sAmplitude: [-2, 0],
  stSlope: [0, 1],
  flutterConduction: [0, 4],
  flutterAmplitude: [0, 0.3],
  atrialPacing: [0, 1],
  atrialRate: [0, 150],
  ventricularPacing: [0, 1],
};

/** Heart rates, bpm, a heart rate control offers for a preset without its own rate floor. */
export const defaultRateLimits: readonly [min: number, max: number] = [
  40,
  paramRanges.heartRate[1],
];

/** Merges a patch over `base` and checks every value; throws RangeError naming the parameter. */
export function resolveParams(
  patch: Partial<HeartParams> = {},
  base: Readonly<HeartParams> = defaultParams,
): Readonly<HeartParams> {
  const params = { ...base };
  for (const [key, value] of Object.entries(patch) as [keyof HeartParams, unknown][]) {
    if (!Object.hasOwn(paramRanges, key))
      throw new RangeError(`Unknown heart clock parameter: ${key}`);
    if (value === undefined) continue;
    params[key] = value as number;
  }
  for (const key of Object.keys(paramRanges) as (keyof HeartParams)[]) {
    const value = params[key];
    const [min, max] = paramRanges[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
      throw new RangeError(`${key} must be a number from ${min} to ${max}, got ${String(value)}`);
    }
  }
  if (!Number.isInteger(params.seed)) {
    throw new RangeError(`seed must be an integer, got ${params.seed}`);
  }
  if (!Number.isInteger(params.pauseEvery) || params.pauseEvery === 1) {
    throw new RangeError(
      `pauseEvery must be 0 or an integer from 2 to 20, got ${params.pauseEvery}`,
    );
  }
  if (!Number.isInteger(params.flutterConduction) || params.flutterConduction === 1) {
    throw new RangeError(
      `flutterConduction must be 0 or an integer from 2 to 4, got ${params.flutterConduction}`,
    );
  }
  if ((params.flutterConduction === 0) !== (params.flutterAmplitude === 0)) {
    throw new RangeError(
      'flutterConduction and flutterAmplitude must both be 0 or both be above 0',
    );
  }
  // assumption: conduction stays fixed, so the rhythm is regular; flutter and fibrillation exclude
  // each other.
  if (params.flutterConduction > 0 && (params.fWaveAmplitude > 0 || params.rrIrregularity > 0)) {
    throw new RangeError('flutterConduction needs fWaveAmplitude and rrIrregularity at 0');
  }
  if (params.deltaWave > params.qrsDuration / 2) {
    throw new RangeError('deltaWave must be at most half of qrsDuration');
  }
  // The slow rise keeps its slope until R overtakes it (ecg.ts); a shorter one would climb above R.
  if (params.deltaWave > 0 && params.deltaWave < 0.15 * (params.qrsDuration - params.deltaWave)) {
    throw new RangeError('deltaWave must be 0 or at least 0.15 of the rest of the QRS');
  }
  // A flutter wave train restarts with every beat; a sinus pause would break it.
  if (params.flutterConduction > 0 && params.pauseEvery > 0) {
    throw new RangeError('flutterConduction needs pauseEvery at 0');
  }
  if (!Number.isInteger(params.atrialPacing)) {
    throw new RangeError(`atrialPacing must be 0 or 1, got ${params.atrialPacing}`);
  }
  // A paced atrium gives a regular rhythm with a captured, upright P wave after every stimulus (the
  // model keeps the lead II P; an inverted P is not part of this mode).
  if (
    params.atrialPacing === 1 &&
    (params.fWaveAmplitude > 0 ||
      params.flutterConduction > 0 ||
      params.rrIrregularity > 0 ||
      params.pauseEvery > 0 ||
      params.pAmplitude <= 0)
  ) {
    throw new RangeError(
      'atrialPacing needs a positive pAmplitude and fWaveAmplitude, flutterConduction, rrIrregularity and pauseEvery at 0',
    );
  }
  // assumption: the lowest P wave rate; no slider offers this parameter, presets set it.
  if (!Number.isInteger(params.atrialRate) || (params.atrialRate > 0 && params.atrialRate < 40)) {
    throw new RangeError(
      `atrialRate must be 0 or an integer from 40 to 150, got ${params.atrialRate}`,
    );
  }
  // P waves on their own clock are sinus P waves that do not reach the ventricles; the rhythms
  // that replace or move them, and pacing, are other modes. That the P rate is above the QRS rate
  // is checked in `checkParams` (clock.ts), which the heart rate limits go through.
  if (
    params.atrialRate > 0 &&
    (params.pAmplitude <= 0 ||
      params.fWaveAmplitude > 0 ||
      params.flutterConduction > 0 ||
      params.rrIrregularity > 0 ||
      params.pauseEvery > 0 ||
      params.atrialPacing > 0 ||
      params.ventricularPacing > 0 ||
      params.atrialContribution > 0)
  ) {
    // atrialContribution: the hemodynamics would draw an atrial kick locked to every QRS.
    throw new RangeError(
      'atrialRate needs a positive pAmplitude and fWaveAmplitude, flutterConduction, rrIrregularity, pauseEvery, atrialPacing, ventricularPacing and atrialContribution at 0',
    );
  }
  if (!Number.isInteger(params.ventricularPacing)) {
    throw new RangeError(`ventricularPacing must be 0 or 1, got ${params.ventricularPacing}`);
  }
  // A paced ventricle follows the pacemaker's timing: a regular rhythm without f or F waves, pauses
  // or pre-excitation.
  if (
    params.ventricularPacing === 1 &&
    (params.fWaveAmplitude > 0 ||
      params.flutterConduction > 0 ||
      params.rrIrregularity > 0 ||
      params.pauseEvery > 0 ||
      params.deltaWave > 0)
  ) {
    throw new RangeError(
      'ventricularPacing needs fWaveAmplitude, flutterConduction, rrIrregularity, pauseEvery and deltaWave at 0',
    );
  }
  if ((params.pauseEvery === 0) !== (params.pauseDuration === 0)) {
    throw new RangeError('pauseEvery and pauseDuration must both be 0 or both be above 0');
  }
  // The aortic valve opens when LV pressure passes aortic diastolic pressure, and the mitral
  // valve only when LV pressure falls below it again.
  if (params.aorticDiastolic + 10 > params.lvSystolic) {
    throw new RangeError('aorticDiastolic must be at least 10 mmHg below lvSystolic');
  }
  // A stenotic valve takes its peak drop off the aortic peak (valve.ts); the aorta must still
  // rise at least 10 mmHg above its diastolic pressure.
  const aorticPeak = params.lvSystolic - gradientPeakPerMean * params.aorticValveGradient;
  if (aorticPeak < params.aorticDiastolic + 10) {
    throw new RangeError(
      'With this aorticValveGradient the aortic peak must stay at least 10 mmHg above aorticDiastolic',
    );
  }
  if (params.lvEndDiastolic + 10 > params.aorticDiastolic) {
    throw new RangeError('lvEndDiastolic must be at least 10 mmHg below aorticDiastolic');
  }
  return Object.freeze(params);
}
