import AorticDissection from './AorticDissection.astro';
import AorticRegurgitation from './AorticRegurgitation.astro';
import AorticStenosis from './AorticStenosis.astro';
import ArrhythmogenicRightVentricularCardiomyopathy from './ArrhythmogenicRightVentricularCardiomyopathy.astro';
import AtrialFibrillation from './AtrialFibrillation.astro';
import AtrialSeptalDefect from './AtrialSeptalDefect.astro';
import AvBlock from './AvBlock.astro';
import BloodFlow from './BloodFlow.astro';
import BrugadaSyndrome from './BrugadaSyndrome.astro';
import CoarctationOfTheAorta from './CoarctationOfTheAorta.astro';
import ConductionSystem from './ConductionSystem.astro';
import CoronaryArteries from './CoronaryArteries.astro';
import CoronaryHeartDisease from './CoronaryHeartDisease.astro';
import DilatedCardiomyopathy from './DilatedCardiomyopathy.astro';
import Dyslipidemia from './Dyslipidemia.astro';
import EbsteinAnomaly from './EbsteinAnomaly.astro';
import HeartChambers from './HeartChambers.astro';
import HeartFailure from './HeartFailure.astro';
import HeartValves from './HeartValves.astro';
import HolterMonitor from './HolterMonitor.astro';
import Hypertension from './Hypertension.astro';
import HypertrophicCardiomyopathy from './HypertrophicCardiomyopathy.astro';
import InfectiveEndocarditis from './InfectiveEndocarditis.astro';
import LongQtSyndrome from './LongQtSyndrome.astro';
import MitralRegurgitation from './MitralRegurgitation.astro';
import MitralStenosis from './MitralStenosis.astro';
import Myocarditis from './Myocarditis.astro';
import NatriureticPeptides from './NatriureticPeptides.astro';
import PatentDuctusArteriosus from './PatentDuctusArteriosus.astro';
import Pericarditis from './Pericarditis.astro';
import PulmonaryEmbolism from './PulmonaryEmbolism.astro';
import PulmonaryHypertension from './PulmonaryHypertension.astro';
import RestrictiveCardiomyopathy from './RestrictiveCardiomyopathy.astro';
import SupraventricularTachycardia from './SupraventricularTachycardia.astro';
import TetralogyOfFallot from './TetralogyOfFallot.astro';
import TranspositionOfTheGreatArteries from './TranspositionOfTheGreatArteries.astro';
import TricuspidRegurgitation from './TricuspidRegurgitation.astro';
import VentricularSeptalDefect from './VentricularSeptalDefect.astro';
import VentricularTachycardia from './VentricularTachycardia.astro';
import WpwSyndrome from './WpwSyndrome.astro';

/** Diagram art by name; the name is what articles pass to `<Diagram name="…">`. */
export const diagrams = {
  'aortic-dissection': AorticDissection,
  'aortic-regurgitation': AorticRegurgitation,
  'aortic-stenosis': AorticStenosis,
  'arrhythmogenic-right-ventricular-cardiomyopathy': ArrhythmogenicRightVentricularCardiomyopathy,
  'atrial-fibrillation': AtrialFibrillation,
  'atrial-septal-defect': AtrialSeptalDefect,
  'av-block': AvBlock,
  'blood-flow': BloodFlow,
  'brugada-syndrome': BrugadaSyndrome,
  'coarctation-of-the-aorta': CoarctationOfTheAorta,
  'conduction-system': ConductionSystem,
  'coronary-arteries': CoronaryArteries,
  'coronary-heart-disease': CoronaryHeartDisease,
  'dilated-cardiomyopathy': DilatedCardiomyopathy,
  dyslipidemia: Dyslipidemia,
  'ebstein-anomaly': EbsteinAnomaly,
  'heart-chambers': HeartChambers,
  'heart-failure': HeartFailure,
  'heart-valves': HeartValves,
  'holter-monitor': HolterMonitor,
  hypertension: Hypertension,
  'hypertrophic-cardiomyopathy': HypertrophicCardiomyopathy,
  'infective-endocarditis': InfectiveEndocarditis,
  'long-qt-syndrome': LongQtSyndrome,
  'mitral-regurgitation': MitralRegurgitation,
  'mitral-stenosis': MitralStenosis,
  myocarditis: Myocarditis,
  'natriuretic-peptides': NatriureticPeptides,
  'patent-ductus-arteriosus': PatentDuctusArteriosus,
  pericarditis: Pericarditis,
  'pulmonary-embolism': PulmonaryEmbolism,
  'pulmonary-hypertension': PulmonaryHypertension,
  'restrictive-cardiomyopathy': RestrictiveCardiomyopathy,
  'supraventricular-tachycardia': SupraventricularTachycardia,
  'tetralogy-of-fallot': TetralogyOfFallot,
  'transposition-of-the-great-arteries': TranspositionOfTheGreatArteries,
  'tricuspid-regurgitation': TricuspidRegurgitation,
  'ventricular-septal-defect': VentricularSeptalDefect,
  'ventricular-tachycardia': VentricularTachycardia,
  'wpw-syndrome': WpwSyndrome,
} as const;

export type DiagramName = keyof typeof diagrams;

/**
 * States a diagram switches between. Each has a `diagram.state.<id>` label and a caption slot of
 * the same name; SVG elements marked `data-only="<id>"` show only in that state.
 */
export const stateIds = [
  'normal',
  'disease',
  'diastole',
  'systole',
  'recording',
  'symptom',
  'scheme',
  'treated',
] as const;
export type StateId = (typeof stateIds)[number];

type StateSpec = { states: readonly StateId[]; initial: StateId };

const single: StateSpec = { states: ['scheme'], initial: 'scheme' };
const cycle: StateSpec = { states: ['diastole', 'systole'], initial: 'diastole' };
/**
 * A disease diagram that also shows the heart after a typical intervention. The only way to add
 * the treated state, so the switch always reads Normal · Disease · After treatment.
 * Spec: docs/plans/2026-10-12-after-treatment-mode.md.
 */
export const withTreatment: StateSpec = {
  states: ['normal', 'disease', 'treated'],
  initial: 'disease',
};

/** Diagrams that do not use the default normal / disease pair. One state means no switch. */
const customStates: Partial<Record<DiagramName, StateSpec>> = {
  'blood-flow': single,
  'conduction-system': single,
  'coronary-arteries': single,
  'heart-chambers': cycle,
  'heart-valves': cycle,
  'natriuretic-peptides': single,
  'holter-monitor': { states: ['recording', 'symptom'], initial: 'recording' },
};

const defaultStates: StateSpec = { states: ['normal', 'disease'], initial: 'disease' };

export function diagramStates(name: DiagramName): StateSpec {
  return customStates[name] ?? defaultStates;
}
