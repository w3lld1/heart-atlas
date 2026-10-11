import AorticStenosis from './AorticStenosis.astro';
import AtrialFibrillation from './AtrialFibrillation.astro';
import AtrialSeptalDefect from './AtrialSeptalDefect.astro';
import CoronaryHeartDisease from './CoronaryHeartDisease.astro';
import HeartFailure from './HeartFailure.astro';
import Hypertension from './Hypertension.astro';

/** Diagram art by name; the name is what articles pass to `<Diagram name="…">`. */
export const diagrams = {
  'aortic-stenosis': AorticStenosis,
  'atrial-fibrillation': AtrialFibrillation,
  'atrial-septal-defect': AtrialSeptalDefect,
  'coronary-heart-disease': CoronaryHeartDisease,
  'heart-failure': HeartFailure,
  hypertension: Hypertension,
} as const;

export type DiagramName = keyof typeof diagrams;
