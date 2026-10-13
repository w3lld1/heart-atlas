import { heartRateLimits } from './clock.ts';
import { defaultRateLimits, resolveParams, type HeartParams } from './params.ts';

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
  'long-qt-syndrome',
  'ventricular-tachycardia',
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
  'long-qt-syndrome': Object.freeze({
    // Long QT syndrome is diagnosed with QTc ≥480 ms, and the risk of torsades de pointes rises
    // with QTc, especially above 500 ms (Minzdrav 2025, Ventricular arrhythmias, quoting the ESC
    // 2022 criteria; MSD Manuals, Long QT Interval Syndromes, 2026; sources 1 and 2 of our long QT
    // article). The model scales QT with √RR, as the Bazett formula does, so `qtc` is the Bazett
    // QTc at every heart rate. assumption: 500 ms, above the diagnostic threshold; a QTc of 500 ms
    // fits the beat up to 137 bpm, so the preset allows 40–137 bpm. The heart rate stays the reader's.
    // Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    qtc: 500,
  }),
  'ventricular-tachycardia': Object.freeze({
    // Monomorphic ventricular tachycardia. The rate is the sign, so this preset sets it: VT is ≥3
    // consecutive ventricular beats at more than 100 per minute (Minzdrav 2025, Ventricular
    // arrhythmias; source 1 of our VT article). assumption: 150, above 100 and inside the rates
    // the wide QRS below allows (101–169). Monomorphic VT is fast and regular with identical QRS
    // complexes (Minzdrav 2025; MSD Manuals, Ventricular Tachycardia, 2024), so rrIrregularity
    // stays 0. Spec: docs/plans/2026-10-12-more-ecg-presets.md.
    heartRate: 150,
    // ECG signs of ventricular arrhythmias: a wide QRS (≥120 ms), no preceding P wave and a T wave
    // discordant to the main QRS deflection (Minzdrav 2025). assumption: 130 ms, the width the
    // model already draws for complete bundle branch block in atrial septal defect; a wider QRS
    // would cut the fastest rates further (140 ms: up to 157 bpm, 160 ms: up to 132). The model
    // keeps the P-to-QRS delay; with no P wave it is a flat stretch before the QRS.
    qrsDuration: 130,
    pAmplitude: 0,
    // The model's QRS is mainly positive (R 1 mV, ecg.ts), so a negative T is discordant to it.
    // assumption: −0.3 mV, the default T amplitude inverted; no source gives a T amplitude.
    tAmplitude: -0.3,
  }),
});

/**
 * The lowest heart rate, bpm, a preset allows, for presets whose rate is itself the sign. With
 * `heartRate` in the preset, switching to it starts at that rate (see `switchedHeartRate`). A
 * preset without a floor here starts at `defaultRateLimits[0]` (40); only a floor here can go
 * below that, down to `paramRanges.heartRate[0]`.
 */
export const presetRateFloors: Readonly<Partial<Record<PresetId, number>>> = Object.freeze({
  // Reentrant SVT is 120–250 bpm (MSD Manuals, Reentrant (Paroxysmal) SVT, 2024).
  'supraventricular-tachycardia': 120,
  // VT runs at more than 100 per minute (Minzdrav 2025, Ventricular arrhythmias): 101 is the lowest
  // whole rate above that, so the slider never shows a rate below the VT definition.
  'ventricular-tachycardia': 101,
});

/**
 * The highest heart rate, bpm, a preset allows, when the sign has an upper bound (atrial flutter:
 * the F waves run at `flutterConduction` times the ventricular rate, inside the source's range).
 */
export const presetRateCeilings: Readonly<Partial<Record<PresetId, number>>> = Object.freeze({});

export function isPresetId(value: string): value is PresetId {
  return (presetIds as readonly string[]).includes(value);
}

/** ECG leads the model can draw. It draws one at a time. */
export const leads = ['II', 'V1'] as const;
export type Lead = (typeof leads)[number];

/**
 * The QRS of each lead without disease, under every preset drawn in that lead. Spec:
 * docs/plans/2026-10-13-heart-clock-rhythms.md, section 4.
 */
export const leadBaselines: Readonly<Record<Lead, Readonly<Partial<HeartParams>>>> = Object.freeze({
  II: Object.freeze({}),
  V1: Object.freeze({
    // V1 has the smallest R wave of the chest leads and the largest S wave (StatPearls,
    // Electrocardiogram): an rS complex. assumption: R 0.3 mV and S −1 mV; the source gives
    // no amplitudes. No q wave: assumption, the source does not mention one in V1.
    qAmplitude: 0,
    rAmplitude: 0.3,
    sAmplitude: -1,
    // The P wave is commonly biphasic in V1 (StatPearls, same); the model draws one hump, so it
    // keeps the lead II P wave. The T wave keeps the lead II shape too (assumption).
  }),
});

/** The lead a preset is drawn in; presets not listed here are drawn in lead II. */
export const presetLeads: Readonly<Partial<Record<PresetId, Lead>>> = Object.freeze({});

/** The lead a preset is drawn in. */
export function presetLead(id: PresetId): Lead {
  return presetLeads[id] ?? 'II';
}

/**
 * Full parameters of a preset: the defaults, the lead's baseline and the preset on top. Switching
 * between presets with these resets every parameter the other preset changed. `lead` is the
 * preset's own by default; an article compares normal with its disease in the disease's lead.
 */
export function presetParams(id: PresetId, lead: Lead = presetLead(id)): Readonly<HeartParams> {
  return resolveParams({ ...leadBaselines[lead], ...presets[id] });
}

/**
 * Heart rates, bpm, a heart rate control offers for a preset: `heartRateLimits` of its parameters,
 * limited below by the preset's floor (40 unless `presetRateFloors` says otherwise). `params` are
 * the preset's own by default; pass them when a caller changed some. Throws RangeError when the
 * floor is above every rate the parameters fit.
 */
export function presetRateLimits(
  id: PresetId,
  params: Readonly<HeartParams> = presetParams(id),
): readonly [min: number, max: number] {
  return rateLimitsFrom(
    params,
    presetRateFloors[id] ?? defaultRateLimits[0],
    `Preset ${id}`,
    presetRateCeilings[id],
  );
}

/**
 * `heartRateLimits` of `params` with `floor` as the lowest rate and `ceiling`, when given, as the
 * highest; `name` goes into the error.
 */
export function rateLimitsFrom(
  params: Readonly<HeartParams>,
  floor: number,
  name = 'This parameter set',
  ceiling = Infinity,
): readonly [min: number, max: number] {
  const [min, max] = heartRateLimits(params);
  const low = Math.max(min, floor);
  const high = Math.min(max, ceiling);
  if (low > high) {
    throw new RangeError(`${name} does not fit any heart rate from ${floor} to ${ceiling}`);
  }
  return [low, high];
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
