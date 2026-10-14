import type { PresetId } from '@heart-atlas/heart-clock';

/** Groups of the state list when a monitor offers many states (the heart clock page, embeds). */
export const presetGroups = ['rhythm', 'conduction', 'structure', 'treated'] as const;
export type PresetGroup = (typeof presetGroups)[number];

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
  'supraventricular-tachycardia': 'rhythm',
  'long-qt-syndrome': 'rhythm',
  'ventricular-tachycardia': 'rhythm',
  'atrial-flutter': 'rhythm',
  'atrial-premature-beats': 'rhythm',
  'ventricular-premature-beats': 'rhythm',
  'sick-sinus-syndrome': 'rhythm',
  'sick-sinus-syndrome-paced': 'treated',
  'wpw-syndrome': 'rhythm',
  'brugada-syndrome': 'rhythm',
  'right-bundle-branch-block': 'conduction',
  'left-bundle-branch-block': 'conduction',
  'left-anterior-fascicular-block': 'conduction',
};

/** A monitor with more states than this shows them as a grouped list instead of a switch. */
export const maxSwitchChoices = 6;
