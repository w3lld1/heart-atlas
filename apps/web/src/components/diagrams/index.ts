import AtrialSeptalDefect from './AtrialSeptalDefect.astro';

/** Diagram art by name; the name is what articles pass to `<Diagram name="…">`. */
export const diagrams = {
  'atrial-septal-defect': AtrialSeptalDefect,
} as const;

export type DiagramName = keyof typeof diagrams;
