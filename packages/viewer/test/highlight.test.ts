import { describe, expect, it } from 'vitest';
import { groupStructures, meshesFor } from '../src/highlight.ts';
import type { ViewerStructure } from '../src/types.ts';

const structures: ViewerStructure[] = [
  { id: 'right-atrium', label: 'RA', group: 'chamber', kind: 'mesh' },
  { id: 'left-atrium', label: 'LA', group: 'chamber', kind: 'mesh' },
  {
    id: 'interatrial-septum',
    label: 'IAS',
    group: 'septum',
    kind: 'zone',
    meshes: ['right-atrium', 'left-atrium'],
  },
  { id: 'aorta', label: 'Ao', group: 'artery', kind: 'mesh' },
];

describe('meshesFor', () => {
  it('expands zones and drops unknown ids', () => {
    expect([...meshesFor(['interatrial-septum', 'aorta', 'nope'], structures)]).toEqual([
      'right-atrium',
      'left-atrium',
      'aorta',
    ]);
  });
});

describe('groupStructures', () => {
  it('keeps the first-seen group order', () => {
    expect(groupStructures(structures).map(([g, items]) => [g, items.length])).toEqual([
      ['chamber', 2],
      ['septum', 1],
      ['artery', 1],
    ]);
  });
});
