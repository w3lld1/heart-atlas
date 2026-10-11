import Cite from './Cite.astro';
import Diagram from './diagrams/Diagram.astro';
import Patient from './Patient.astro';
import Student from './Student.astro';

/** Components MDX articles use without imports; every page that renders an article passes these. */
export const articleComponents = { Cite, Diagram, Patient, Student };
