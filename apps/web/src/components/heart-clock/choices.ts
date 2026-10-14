import {
  presetLead,
  presetParams,
  presetRateLimits,
  setsHeartRate,
  type HeartParams,
  type Lead,
  type PresetId,
} from '@heart-atlas/heart-clock';
import { clamp, type ClockChoice } from './clock-choice.ts';
import type { PresetGroup } from './preset-groups.ts';

export type { ClockChoice };

// Resolves presets where the preset table is loaded anyway: in the build for article and page
// monitors, at run time only for the ECG embed, whose query string picks the preset and rate.
// The monitor island then gets ready choices and does not load the table (#425).

/** Parameters of a preset with the caller's overrides, or undefined if the two do not fit. */
function mergedParams(id: PresetId, params: Partial<HeartParams> | undefined, lead: Lead) {
  const merged = { ...presetParams(id, lead), ...params };
  try {
    const limits = presetRateLimits(id, merged);
    // presetRateLimits checks every rate itself, so a caller's rate outside them would only fail
    // later, when the clock is created; keep it inside instead. A preset with a rate floor
    // (SVT) also keeps a caller's slower rate at the floor.
    return { params: { ...merged, heartRate: clamp(merged.heartRate, limits) }, limits, lead };
  } catch (error) {
    if (error instanceof RangeError) return undefined;
    throw error;
  }
}

/** The caller's parameters without their heart rate. */
function withoutHeartRate(params: Partial<HeartParams> | undefined): Partial<HeartParams> {
  const rest = { ...params };
  delete rest.heartRate;
  return rest;
}

/**
 * The group of every preset; `normal` stands first, outside the groups. A new preset must be
 * placed here, or the type check fails. Issue #317.
 */
export const presetGroup: Readonly<Record<PresetId, PresetGroup | null>> = {
  normal: null,
  'atrial-fibrillation': 'rhythm',
  stemi: 'structure',
  'heart-failure': 'structure',
  hypertension: 'structure',
  'aortic-stenosis': 'structure',
  'atrial-septal-defect': 'structure',
  'av-block-first-degree': 'conduction',
  'av-block-second-degree-mobitz-1': 'conduction',
  'av-block-second-degree-mobitz-2': 'conduction',
  'av-block-third-degree': 'conduction',
  'av-block-third-degree-paced': 'treated',
  'sinus-tachycardia': 'rhythm',
  'focal-atrial-tachycardia': 'rhythm',
  'supraventricular-tachycardia': 'rhythm',
  'long-qt-syndrome': 'rhythm',
  'short-qt-syndrome': 'rhythm',
  'ventricular-tachycardia': 'rhythm',
  'bidirectional-ventricular-tachycardia': 'rhythm',
  'ventricular-fibrillation': 'rhythm',
  'atrial-flutter': 'rhythm',
  'atrial-premature-beats': 'rhythm',
  'ventricular-premature-beats': 'rhythm',
  'sick-sinus-syndrome': 'rhythm',
  'sick-sinus-syndrome-paced': 'treated',
  'wpw-syndrome': 'rhythm',
  'brugada-syndrome': 'rhythm',
  'early-repolarization': 'rhythm',
  'right-bundle-branch-block': 'conduction',
  'left-bundle-branch-block': 'conduction',
  'left-anterior-fascicular-block': 'conduction',
};

/**
 * Presets that fit the caller's parameters, in the order given; without `presets`, only the
 * starting preset. `lead` draws every preset in one lead, so an article compares normal with its
 * disease in the disease's lead; without it each preset is drawn in its own (`presetLead`).
 */
export function clockChoices(
  presets: readonly PresetId[] | undefined,
  preset?: PresetId,
  params?: Partial<HeartParams>,
  lead?: Lead,
): ClockChoice[] {
  const ids = presets ?? [preset ?? 'normal'];
  const initial = preset ?? ids[0];
  // A caller's rate (an embed's ?rate=) applies to the preset the monitor starts with; a preset
  // that sets its own rate (SVT) still starts at it when the reader switches to it later.
  const rateless = withoutHeartRate(params);
  return ids.flatMap((id) => {
    const merged = mergedParams(
      id,
      setsHeartRate(id) && id !== initial ? rateless : params,
      lead ?? presetLead(id),
    );
    return merged ? [{ id, ...merged, setsRate: setsHeartRate(id), group: presetGroup[id] }] : [];
  });
}
