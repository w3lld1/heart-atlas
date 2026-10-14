import type { DiseaseId } from './disease.ts';

export const viewerMessageKeys = [
  'viewer.load',
  'viewer.loading',
  'viewer.error',
  'viewer.posterAlt',
  'viewer.unavailable',
  'viewer.canvasLabel',
  'viewer.keyboardHelp',
  'viewer.structures',
  'viewer.selected',
  'viewer.none',
  'viewer.clear',
  'viewer.ghost',
  'viewer.isolate',
  'viewer.section',
  'viewer.section.off',
  'viewer.section.sagittal',
  'viewer.section.frontal',
  'viewer.section.transverse',
  'viewer.section.position',
  'viewer.schematic',
  'viewer.attribution',
  'viewer.group.chamber',
  'viewer.group.septum',
  'viewer.group.valve',
  'viewer.group.muscle',
  'viewer.group.artery',
  'viewer.group.vein',
  'viewer.group.coronary-artery',
  'viewer.group.cardiac-vein',
  'viewer.group.conduction',
  'viewer.group.layer',
  'viewer.heartbeat.start',
  'viewer.heartbeat.stop',
  'viewer.heartbeat.rate',
  'viewer.heartbeat.rateValue',
  'viewer.heartbeat.note',
  'viewer.heartbeat.fibrillation',
  'viewer.disease.note',
  'viewer.disease.pick',
  'viewer.disease.startBeat',
  'viewer.disease.pick.normal',
  'viewer.disease.article',
  'viewer.disease.view',
  'viewer.disease.view.normal',
  'viewer.disease.view.disease',
  'viewer.disease.sources',
  'viewer.disease.marker.atrial-septal-defect',
  'viewer.disease.marker.ventricular-septal-defect',
  'viewer.disease.mitral-stenosis',
  'viewer.disease.mitral-stenosis.beat',
  'viewer.disease.mitral-regurgitation',
  'viewer.disease.aortic-regurgitation',
  'viewer.disease.tricuspid-regurgitation',
  'viewer.disease.pulmonary-valve-stenosis.beat',
  'viewer.disease.pulmonary-hypertension',
  'viewer.disease.ventricular-septal-defect',
  'viewer.disease.restrictive-cardiomyopathy',
  'viewer.disease.thoracic-aortic-aneurysm',
  'viewer.disease.coronary-heart-disease',
  'viewer.disease.hypertension',
  'viewer.disease.hypertrophic-cardiomyopathy',
  'viewer.disease.dilated-cardiomyopathy',
  'viewer.disease.atrial-septal-defect',
  'viewer.disease.heart-failure.beat',
  'viewer.disease.atrial-fibrillation.beat',
  'viewer.disease.coronary-heart-disease.beat',
  'viewer.disease.aortic-stenosis.beat',
  'viewer.disease.dilated-cardiomyopathy.beat',
] as const;

export type ViewerMessageKey = (typeof viewerMessageKeys)[number];
export type ViewerMessages = Record<ViewerMessageKey, string>;

export interface ViewerStructure {
  id: string;
  /** Localized name. */
  label: string;
  group: string;
  kind: 'mesh' | 'zone';
  /** For zones: the meshes highlighted together. */
  meshes?: string[];
}

/** A model source credit; `lang` marks one written in another language than the page. */
export interface AttributionPart {
  text: string;
  lang?: string;
}

export type SectionAxis = 'off' | 'sagittal' | 'frontal' | 'transverse';

export interface ViewerModels {
  /** Detailed model for desktops. */
  high: string;
  /** Lighter model for phones; loaded first on small or touch screens. */
  low: string;
}

/** A disease the reader can pick on the model, with its localized name and article link. */
export interface DiseaseChoice {
  id: DiseaseId;
  label: string;
  href: string;
  /** Language and direction of `label` when the article falls back to another locale. */
  lang?: string;
  dir?: 'ltr' | 'rtl';
}

export interface HeartViewerProps {
  models: ViewerModels;
  /** Static image shown until the 3D model loads, and instead of it when WebGL is missing. */
  poster: string;
  structures: ViewerStructure[];
  messages: ViewerMessages;
  /** Structure ids highlighted on load, e.g. from an article's `structures`. */
  highlight?: string[];
  /**
   * 'visible' loads three.js when the viewer scrolls into view; 'click' waits for the button;
   * 'auto' behaves like 'visible' on desktops and like 'click' on phones and narrow screens, so a
   * phone downloads the 3D code and model only when the reader asks for them.
   */
  loadOn?: 'visible' | 'click' | 'auto';
  /** Level of the structure list heading, so the viewer fits the outline of the page around it. */
  headingLevel?: 2 | 3 | 4;
  /**
   * Heartbeat. 'own' gives the reader a start button and a heart rate control, driving the model
   * from its own heart clock; 'page' follows the heart clock island on the same page through
   * `@heart-atlas/heart-clock/cycle-source`. Absent: the model never moves.
   */
  cycle?: 'own' | 'page';
  /** Disease article id whose signs the model shows: docs/plans/2026-10-12-disease-signs-3d.md. */
  disease?: DiseaseId;
  /**
   * Diseases the reader can pick from a list: docs/plans/2026-10-13-disease-picker-3d.md. The
   * pick is kept in the page address as `?disease=<id>`. Takes the place of `disease`.
   */
  diseases?: DiseaseChoice[];
  /**
   * Model source credits the source licenses require, filled into `{source}` of
   * `viewer.attribution` and joined by "; ". Required so no page shows the model uncredited.
   */
  attribution: AttributionPart[];
  /**
   * Section shown on load. Congenital models open cut, since their defects are inside the heart:
   * docs/plans/2026-10-12-congenital-models.md.
   */
  section?: SectionAxis;
}
