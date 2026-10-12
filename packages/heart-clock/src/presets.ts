import { heartRateLimits } from './clock.ts';
import { resolveParams, type HeartParams } from './params.ts';

/**
 * Disease presets: parameter sets that show the textbook signs of each disease of the MVP.
 * Every number either comes from a source in docs/plans/2026-10-11-stage-3-sources.md or the
 * preset's own spec (cited in the comment next to it) or is marked `assumption`. Specs:
 * docs/plans/2026-10-11-stage-3-presets.md, docs/plans/2026-10-12-more-ecg-presets.md.
 */
export const presetIds = [
  'normal',
  'atrial-fibrillation',
  'stemi',
  'heart-failure',
  'hypertension',
  'aortic-stenosis',
  'atrial-septal-defect',
  'av-block-first-degree',
  'supraventricular-tachycardia',
] as const;

export type PresetId = (typeof presetIds)[number];

export const presets: Readonly<Record<PresetId, Readonly<Partial<HeartParams>>>> = Object.freeze({
  normal: Object.freeze({}),
  'atrial-fibrillation': Object.freeze({
    // No P waves and irregular RR intervals: ESC 2024 AF, §3.1; ACC/AHA 2023 AF, Table 4.
    pAmplitude: 0,
    // assumption: how irregular. Sources say only that RR intervals follow no pattern.
    rrIrregularity: 0.2,
    // Fibrillatory waves (ACC/AHA 2023, Table 4) at 360 per minute: inside 300–500/min
    // (ACC/AHA 2023, §2.3) and 350–700/min (Minzdrav 2025, as quoted in our AF article).
    fWaveFrequency: 6,
    // assumption: f-wave amplitude; no source gives one.
    fWaveAmplitude: 0.05,
    // Loss of effective atrial contraction (ESC 2024 AF, §3.1): no atrial share of filling.
    atrialContribution: 0,
  }),
  stemi: Object.freeze({
    // ST elevation at the J point of ≥1 mm (0.1 mV) in leads other than V2–V3 (ESC 2023 ACS,
    // §3.2.1); the model's lead is like lead II. 0.2 mV, reached at the J point, is twice that
    // threshold. Sources ask for two contiguous leads; the model shows one.
    stShift: 0.2,
  }),
  'heart-failure': Object.freeze({
    // Heart failure with reduced ejection fraction: LVEF ≤40% (StatPearls, Heart Failure; also
    // Minzdrav 2024 as quoted in our article). 30% is an example inside that group.
    ejectionFraction: 0.3,
  }),
  hypertension: Object.freeze({
    // Stage 2 hypertension, clinic BP from 160/100 to below 180/120 (NICE NG136); above the
    // ESC 2024 threshold of 140/90. assumption: LV systolic pressure equals systolic BP.
    lvSystolic: 160,
    aorticDiastolic: 100,
  }),
  'aortic-stenosis': Object.freeze({
    // Severe aortic stenosis: mean gradient ≥40 mmHg (ACC/AHA 2020 VHD, Table 13).
    aorticValveGradient: 40,
    // The stenosis raises LV systolic pressure (StatPearls, Aortic Stenosis). assumption: 180,
    // so the aortic peak stays near 120 mmHg (119 in the model); no source gives an LV pressure.
    lvSystolic: 180,
  }),
  'atrial-septal-defect': Object.freeze({
    // ASD gives incomplete or complete right bundle branch block (Minzdrav 2023, §2.4); complete
    // RBBB has QRS >0.12 s (StatPearls, Electrocardiogram). The model only widens the QRS; it
    // cannot draw the block's shape, and the width of an incomplete block has no source.
    qrsDuration: 130,
    // Wide fixed split of S2 (StatPearls, Atrial Septal Defect; Minzdrav 2023, §2.2).
    // assumption: the split size; no source gives it in ms.
    s2Split: 50,
  }),
  'av-block-first-degree': Object.freeze({
    // First-degree AV block: every P wave is followed by a QRS, but PR is longer than 0.20 s
    // (MSD Manuals, Atrioventricular Block, 2024; source 2 of our AV block article). assumption:
    // 260 ms at 60 bpm. The model scales PR with √RR, and 260 keeps PR above 200 ms at every
    // heart rate this preset allows (40–96 bpm; about 233 ms at 75 and 205 ms at 96). With 240,
    // PR would drop below 200 ms from 87 bpm. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    prInterval: 260,
  }),
  'supraventricular-tachycardia': Object.freeze({
    // Typical AV nodal re-entrant tachycardia. The rate is the sign, so this preset sets it:
    // reentrant SVT runs at 120–250 bpm (MSD Manuals, Reentrant (Paroxysmal) SVT, 2024; source 3
    // of our SVT article). assumption: 170, inside that range and below the model's limit of 180.
    // The rhythm is regular (MSD, same), so rrIrregularity stays 0, and the QRS is narrow, ≤120 ms
    // (Minzdrav 2025, Supraventricular tachycardias; source 1), so qrsDuration stays 90.
    heartRate: 170,
    // In typical AVNRT retrograde P′ waves merge with the QRS complex or sit at its end (Minzdrav
    // 2025; MSD). assumption: 0 draws "no separate P wave"; the model cannot draw P′ at the end of
    // QRS, and it has no retrograde P′ at all.
    pAmplitude: 0,
  }),
});

/**
 * The lowest heart rate, bpm, a preset allows, for presets whose rate is itself the sign. With
 * `heartRate` in the preset, switching to it starts at that rate (see `switchedHeartRate`).
 */
export const presetRateFloors: Readonly<Partial<Record<PresetId, number>>> = Object.freeze({
  // Reentrant SVT is 120–250 bpm (MSD Manuals, Reentrant (Paroxysmal) SVT, 2024).
  'supraventricular-tachycardia': 120,
});

export function isPresetId(value: string): value is PresetId {
  return (presetIds as readonly string[]).includes(value);
}

/**
 * Full parameters of a preset: the defaults with the preset on top. Switching between presets
 * with these resets every parameter the other preset changed.
 */
export function presetParams(id: PresetId): Readonly<HeartParams> {
  return resolveParams(presets[id]);
}

/**
 * Heart rates, bpm, a heart rate control offers for a preset: `heartRateLimits` of its parameters,
 * raised to the preset's floor. `params` are the preset's own by default; pass them when a caller
 * changed some. Throws RangeError when the floor is above every rate the parameters fit.
 */
export function presetRateLimits(
  id: PresetId,
  params: Readonly<HeartParams> = presetParams(id),
): readonly [min: number, max: number] {
  const [min, max] = heartRateLimits(params);
  const floor = presetRateFloors[id] ?? min;
  if (floor > max) throw new RangeError(`Preset ${id} does not fit any heart rate from ${floor}`);
  return [Math.max(min, floor), max];
}

/** Whether a preset sets its own heart rate. */
export function setsHeartRate(id: PresetId): boolean {
  return presets[id].heartRate !== undefined;
}

/**
 * Heart rate after switching from one preset to another. Switching to a preset that sets its own
 * rate starts at that rate, and leaving one goes back to the next preset's rate (75 by default);
 * between other presets the reader's rate stays. `startRate` is the next preset's starting rate,
 * when a caller changed it. The caller keeps the result inside `presetRateLimits`.
 */
export function switchedHeartRate(
  from: PresetId,
  to: PresetId,
  rate: number,
  startRate: number = presetParams(to).heartRate,
): number {
  return setsHeartRate(from) || setsHeartRate(to) ? startRate : rate;
}
