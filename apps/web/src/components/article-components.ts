import Cite from './Cite.astro';
import Diagram from './diagrams/Diagram.astro';
import EcgMonitor from './EcgMonitor.astro';
import Patient from './Patient.astro';
import Quiz from './Quiz.astro';
import Structure from './Structure.astro';
import Student from './Student.astro';
import CongenitalModel from './viewer/CongenitalModel.astro';
import HeartModel from './viewer/HeartModel.astro';

/** Components MDX articles use without imports; every page that renders an article passes these. */
export const articleComponents = {
  Cite,
  CongenitalModel,
  Diagram,
  EcgMonitor,
  HeartModel,
  Patient,
  Quiz,
  Structure,
  Student,
};
