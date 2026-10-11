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

export type SectionAxis = 'off' | 'sagittal' | 'frontal' | 'transverse';

export interface ViewerModels {
  /** Detailed model for desktops. */
  high: string;
  /** Lighter model for phones; loaded first on small or touch screens. */
  low: string;
}

export interface HeartViewerProps {
  models: ViewerModels;
  /** Static image shown until the 3D model loads, and instead of it when WebGL is missing. */
  poster: string;
  structures: ViewerStructure[];
  messages: ViewerMessages;
  /** Structure ids highlighted on load, e.g. from an article's `structures`. */
  highlight?: string[];
  /** 'visible' loads three.js when the viewer scrolls into view; 'click' waits for the button. */
  loadOn?: 'visible' | 'click';
  /** Level of the structure list heading, so the viewer fits the outline of the page around it. */
  headingLevel?: 2 | 3 | 4;
}
