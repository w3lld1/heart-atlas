/** A diagram component: inline SVG for a locale, with `uid` prefixing ids inside it. */
type DiagramArt = (props: { locale: string; uid: string }) => unknown;

const files = import.meta.glob<DiagramArt>(['./*.astro', '!./Diagram.astro'], {
  eager: true,
  import: 'default',
});

/**
 * Diagram art by name; the name is what articles pass to `<Diagram name="…">`. Every component in
 * this folder except Diagram.astro is a diagram, named after its file: AvBlock.astro is "av-block".
 * So the folder holds only diagrams, and file names are PascalCase words without acronyms.
 * A new diagram is only a new file, so articles written at the same time do not touch a shared list.
 */
export const diagrams: Readonly<Record<string, DiagramArt>> = Object.fromEntries(
  Object.entries(files).map(([path, art]) => [
    path
      .slice('./'.length, -'.astro'.length)
      .replace(/(?<!^)([A-Z])/g, '-$1')
      .toLowerCase(),
    art,
  ]),
);

/** A diagram name; an unknown one fails the build in Diagram.astro. */
export type DiagramName = string;

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
  'rbbb',
  'lbbb',
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

/**
 * Diagrams that do not use the default normal / disease pair, sorted by name. One state means no
 * switch.
 */
const customStates: Partial<Record<DiagramName, StateSpec>> = {
  'aortic-stenosis': withTreatment,
  'atrial-septal-defect': withTreatment,
  'blood-flow': single,
  // Opens on the left block: it is the one tied to heart failure and to chest-pain emergencies.
  'bundle-branch-block': { states: ['normal', 'rbbb', 'lbbb'], initial: 'lbbb' },
  'coarctation-of-the-aorta': withTreatment,
  'conduction-system': single,
  'coronary-arteries': single,
  'heart-chambers': cycle,
  'heart-valves': cycle,
  'holter-monitor': { states: ['recording', 'symptom'], initial: 'recording' },
  'natriuretic-peptides': single,
  'patent-ductus-arteriosus': withTreatment,
  'tetralogy-of-fallot': withTreatment,
  'ventricular-septal-defect': withTreatment,
};

// A name with no file behind it (a typo, a renamed diagram) fails the build.
for (const name of Object.keys(customStates)) {
  if (!Object.hasOwn(diagrams, name)) throw new Error(`customStates: no diagram "${name}"`);
}

const defaultStates: StateSpec = { states: ['normal', 'disease'], initial: 'disease' };

export function diagramStates(name: DiagramName): StateSpec {
  return customStates[name] ?? defaultStates;
}
