// Test fixture for HA_TEST_CONTENT=1 builds: diagrams that only the test content uses. Diagram.astro
// looks them up in that build only, so real articles cannot use them.
import { withTreatment } from '../../../src/components/diagrams/index.ts';
import DemoTreated from './DemoTreated.astro';

export type TestDiagram = typeof withTreatment & { art: typeof DemoTreated };

export const testDiagrams: Record<string, TestDiagram> = {
  'demo-treated': { art: DemoTreated, ...withTreatment },
};
