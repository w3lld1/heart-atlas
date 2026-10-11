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
});

/** Inclusive [min, max] for every parameter. */
export const paramRanges: Readonly<Record<keyof HeartParams, readonly [number, number]>> = {
  heartRate: [40, 180],
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
};

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
