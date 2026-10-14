import type { PresetId } from '@heart-atlas/heart-clock';
import type { ChamberId, ValveId } from './cycle.ts';
import type { ViewerMessageKey } from './types.ts';

// Shapes of disease on the normal heart model: docs/plans/2026-10-12-disease-signs-3d.md. Every
// sign comes from a source already checked in the disease article (`article`, its Cite number) or
// opened for the spec (`extra`, shown under the model). Sizes no source gives are assumptions.

export const diseaseIds = [
  'heart-failure',
  'atrial-fibrillation',
  'coronary-heart-disease',
  'hypertension',
  'aortic-stenosis',
  'hypertrophic-cardiomyopathy',
  'dilated-cardiomyopathy',
  'atrial-septal-defect',
  'mitral-stenosis',
  'mitral-regurgitation',
  'aortic-regurgitation',
  'tricuspid-regurgitation',
  'pulmonary-valve-stenosis',
  'pulmonary-hypertension',
  'ventricular-septal-defect',
  'restrictive-cardiomyopathy',
  'thoracic-aortic-aneurysm',
] as const;

export type DiseaseId = (typeof diseaseIds)[number];

export const isDiseaseId = (value: unknown): value is DiseaseId =>
  (diseaseIds as readonly unknown[]).includes(value);

/** A part of the left ventricle wall, weighted by distance to a mesh the model already has. */
export type ZoneKind = 'inferior' | 'septal';

export interface DiseaseSource {
  label: string;
  url: string;
}

export interface DiseaseShape {
  /** Meshes lit with the disease colour. */
  tint?: string[];
  /** A coloured zone of the left ventricle; `motion` scales its contraction (1 = normal). */
  zone?: { kind: ZoneKind; motion: number };
  /**
   * Chambers that grow about their own centres by these factors; what each carries moves along
   * (GROW_WITH in disease-geometry.ts). The vessels on the ventricles grow about their common
   * centre by the mean of the two ventricles (growOnVentricles), so they stay on the surface.
   */
  grow?: Partial<Record<ChamberId, number>>;
  /** Multiplies how far a valve opens. */
  narrow?: Partial<Record<ValveId, number>>;
  /** A valve that does not close: the share of its full opening that stays open when shut. */
  leak?: Partial<Record<ValveId, number>>;
  /** The tubular ascending aorta widens across its axis: 0.5 = half as wide again. */
  aortaBulge?: number;
  /** Zone id that gets a marker next to it. */
  marker?: string;
  /**
   * A sign seen only while the heart beats: `true` when the viewer draws it (zone motion, valve),
   * a preset id when it comes from the heart clock running that preset.
   */
  beat?: true | PresetId;
  /** How the sign was sourced; `extra` sources are shown under the model. */
  sources: { article: number[]; extra?: DiseaseSource[] };
}

const LV = 'left-ventricle';

export const diseaseShapes: Record<DiseaseId, DiseaseShape> = {
  // Weak contraction and resting atria come from the heart clock preset itself.
  'heart-failure': { beat: 'heart-failure', sources: { article: [] } },
  'atrial-fibrillation': { beat: 'atrial-fibrillation', sources: { article: [] } },
  'coronary-heart-disease': {
    beat: true,
    // assumption: how much less the zone moves; the source says only that its motion is abnormal.
    zone: { kind: 'inferior', motion: 0.3 },
    sources: {
      article: [2],
      extra: [
        {
          label: 'StatPearls: Inferior Myocardial Infarction',
          url: 'https://www.statpearls.com/point-of-care/23500',
        },
        {
          label: 'StatPearls: Acute Myocardial Infarction',
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK459269/',
        },
      ],
    },
  },
  // The model's ventricles are cavity surfaces, so a thick wall is shown by colour, not by shape.
  hypertension: { tint: [LV], sources: { article: [2] } },
  // assumption: the share of the normal opening; the model does not compute the valve area.
  'aortic-stenosis': { narrow: { 'aortic-valve': 0.4 }, beat: true, sources: { article: [3] } },
  'hypertrophic-cardiomyopathy': {
    tint: [LV],
    zone: { kind: 'septal', motion: 1 },
    sources: { article: [2, 3] },
  },
  'dilated-cardiomyopathy': {
    // assumption: the size, kept small enough not to cut into the right ventricle.
    grow: { 'left-ventricle': 1.15 },
    tint: [LV],
    beat: 'heart-failure',
    sources: { article: [1, 2] },
  },
  'atrial-septal-defect': { marker: 'interatrial-septum', sources: { article: [1] } },
  // Shapes added by docs/plans/2026-10-13-disease-picker-3d.md; quotes for each sign in
  // /mnt/project-files/evidence/disease-shapes-3d.md. Sizes no source gives: assumptions, kept
  // small enough that a grown chamber does not cut deep into its neighbours.
  'mitral-stenosis': {
    // assumption: share of the normal opening; assumption: atrium size.
    narrow: { 'mitral-valve': 0.4 },
    grow: { 'left-atrium': 1.2 },
    beat: true,
    sources: { article: [2, 4] },
  },
  'mitral-regurgitation': {
    // assumption: width of the gap; assumption: atrium size.
    leak: { 'mitral-valve': 0.25 },
    grow: { 'left-atrium': 1.2 },
    sources: { article: [2, 4] },
  },
  'aortic-regurgitation': {
    // assumption: width of the gap; assumption: ventricle size, as in dilated cardiomyopathy.
    leak: { 'aortic-valve': 0.25 },
    grow: { 'left-ventricle': 1.15 },
    sources: { article: [2, 4] },
  },
  'tricuspid-regurgitation': {
    // assumption: width of the gap; assumption: chamber sizes.
    leak: { 'tricuspid-valve': 0.25 },
    grow: { 'right-atrium': 1.2, 'right-ventricle': 1.12 },
    sources: { article: [3, 4] },
  },
  // assumption: share of the normal opening. The right ventricle is not enlarged: its wall thickens.
  'pulmonary-valve-stenosis': {
    narrow: { 'pulmonary-valve': 0.4 },
    beat: true,
    sources: { article: [1, 3] },
  },
  'pulmonary-hypertension': {
    tint: ['right-ventricle'],
    // assumption: ventricle size.
    grow: { 'right-ventricle': 1.12 },
    sources: { article: [1, 3] },
  },
  'ventricular-septal-defect': {
    marker: 'interventricular-septum',
    // assumption: chamber sizes; they grow only with a large shunt, which the caption says.
    grow: { 'left-atrium': 1.15, 'left-ventricle': 1.1 },
    sources: { article: [1] },
  },
  'restrictive-cardiomyopathy': {
    // assumption: atrium sizes. The left ventricle is usually not enlarged; the source says nothing of the right.
    grow: { 'left-atrium': 1.25, 'right-atrium': 1.25 },
    sources: { article: [3, 4] },
  },
  // The model widens the tubular ascending aorta above a normal root, as the article diagram does
  // [1, 2], the part where thoracic aneurysms are most common [3]. There is no single size for an
  // aneurysm; two sources take a widening by more than 50% (article [2, 4]).
  // assumption: 60%, just over that threshold.
  'thoracic-aortic-aneurysm': { aortaBulge: 0.6, sources: { article: [1, 2, 3, 4] } },
};

/** Whether the shape changes the model at rest, so its still caption applies without a heartbeat. */
export const hasStillSigns = (shape: DiseaseShape): boolean =>
  Boolean(shape.tint ?? shape.zone ?? shape.grow ?? shape.leak ?? shape.aortaBulge ?? shape.marker);

/**
 * A note under the model for a heart clock preset whose state the model does not draw. In
 * ventricular fibrillation the ventricles quiver but pump no blood (MSD Manuals, Ventricular
 * Fibrillation, 2024); the model stays still, and the note keeps that from reading as asystole.
 * Spec: docs/plans/2026-10-14-heart-clock-ventricular-fibrillation.md.
 */
export const presetNote: Readonly<Partial<Record<PresetId, ViewerMessageKey>>> = {
  'ventricular-fibrillation': 'viewer.heartbeat.fibrillation',
};

/** Shape shown for each heart clock preset on a page that follows the clock. */
export const presetShape: Record<PresetId, DiseaseId | null> = {
  normal: null,
  'atrial-fibrillation': 'atrial-fibrillation',
  stemi: 'coronary-heart-disease',
  'heart-failure': 'heart-failure',
  hypertension: 'hypertension',
  'aortic-stenosis': 'aortic-stenosis',
  'atrial-septal-defect': 'atrial-septal-defect',
  'av-block-first-degree': null,
  'av-block-second-degree-mobitz-1': null,
  'av-block-second-degree-mobitz-2': null,
  'av-block-third-degree': null,
  'av-block-third-degree-paced': null,
  'sinus-tachycardia': null,
  'focal-atrial-tachycardia': null,
  'supraventricular-tachycardia': null,
  'long-qt-syndrome': null,
  'short-qt-syndrome': null,
  'ventricular-tachycardia': null,
  'bidirectional-ventricular-tachycardia': null,
  'ventricular-fibrillation': null,
  'atrial-flutter': null,
  'atrial-premature-beats': null,
  'ventricular-premature-beats': null,
  'sick-sinus-syndrome': null,
  'sick-sinus-syndrome-paced': null,
  'wpw-syndrome': null,
  'brugada-syndrome': null,
  'right-bundle-branch-block': null,
  'left-bundle-branch-block': null,
  'left-anterior-fascicular-block': null,
};

/** What the model shows of a disease: its id, and whether its still and heartbeat captions apply. */
export interface DiseaseView {
  id: DiseaseId;
  still: boolean;
  beat: boolean;
}

/**
 * The disease a viewer shows: its own, or else the preset of the clock it follows. Heartbeat
 * signs apply while the model beats; preset signs only while the clock runs that preset.
 */
export function diseaseView(
  own: DiseaseId | undefined,
  preset: PresetId | null,
  beating: boolean,
): DiseaseView | null {
  const id = own ?? (preset ? presetShape[preset] : null);
  if (!id) return null;
  const shape = diseaseShapes[id];
  const beat = shape.beat === true ? beating : shape.beat !== undefined && shape.beat === preset;
  return { id, still: hasStillSigns(shape), beat };
}

/** Query parameter that keeps the disease picked on the model, so the page link can be shared. */
export const DISEASE_PARAM = 'disease';

/** The picked disease in a page query string, if it is one of `choices`. */
export function diseaseFromQuery(search: string, choices: readonly DiseaseId[]): DiseaseId | null {
  const value = new URLSearchParams(search).get(DISEASE_PARAM);
  return choices.find((id) => id === value) ?? null;
}

/** The query string with `id` picked, or with the pick removed for null; other params stay. */
export function queryWithDisease(search: string, id: DiseaseId | null): string {
  const params = new URLSearchParams(search);
  if (id) params.set(DISEASE_PARAM, id);
  else params.delete(DISEASE_PARAM);
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** What decides the disease a viewer draws: docs/plans/2026-10-13-disease-picker-3d.md. */
export interface ShownDiseaseInput {
  /** The viewer offers a picker; `picked` is the reader's choice from it. */
  picker: boolean;
  picked: DiseaseId | null;
  own: DiseaseId | undefined;
  /** The viewer follows the heart clock on the page. */
  followsClock: boolean;
  /** The reader's normal / disease switch of a viewer with its own disease and no clock. */
  showOwn: boolean;
  preset: PresetId | null;
}

/**
 * The disease drawn and the clock preset it may follow. A picker decides alone. A viewer with
 * its own disease that follows a clock switches with the clock's normal preset; without a clock it
 * has a switch of its own (`ownSwitch`).
 */
export function shownDisease(input: ShownDiseaseInput): {
  disease: DiseaseId | undefined;
  preset: PresetId | null;
  ownSwitch: boolean;
} {
  if (input.picker) return { disease: input.picked ?? undefined, preset: null, ownSwitch: false };
  if (!input.own) return { disease: undefined, preset: input.preset, ownSwitch: false };
  const ownSwitch = !input.followsClock;
  const shown = ownSwitch ? input.showOwn : input.preset !== 'normal';
  return shown
    ? { disease: input.own, preset: input.preset, ownSwitch }
    : { disease: undefined, preset: null, ownSwitch };
}

/**
 * Whether a disease shows on a viewer with its own heartbeat, like the 3D page: it has still signs
 * or signs the viewer draws itself. Signs that come from a clock preset need that clock.
 */
export const shownOnAnatomy = (id: DiseaseId): boolean =>
  hasStillSigns(diseaseShapes[id]) || diseaseShapes[id].beat === true;
