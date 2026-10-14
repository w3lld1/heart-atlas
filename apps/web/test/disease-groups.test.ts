import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import en from '../src/i18n/messages/en.json' with { type: 'json' };
import {
  diseaseGroupOf,
  diseaseGroupOrder,
  diseaseGroups,
  groupDiseases,
} from '../src/lib/disease-groups.ts';

describe('disease groups', () => {
  it('lists every slug once', () => {
    const slugs = Object.values(diseaseGroups).flat();
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('has a title for every group', () => {
    for (const group of diseaseGroupOrder) {
      expect(en).toHaveProperty(`catalog.group.${group}`);
    }
  });

  it('puts every published disease in a named group', () => {
    const dir = new URL('../../../content/en/disease/', import.meta.url);
    const slugs = readdirSync(dir)
      .filter((file) => file.endsWith('.mdx'))
      .map((file) => file.slice(0, -'.mdx'.length));
    expect(slugs.filter((slug) => diseaseGroupOf(slug) === 'other')).toEqual([]);
  });

  it('splits items in display order and sends unknown slugs to "other"', () => {
    const result = groupDiseases(['unknown-disease', 'aortic-stenosis', 'av-block'], (s) => s);
    expect(result).toEqual([
      { group: 'rhythm', items: ['av-block'] },
      { group: 'valves', items: ['aortic-stenosis'] },
      { group: 'other', items: ['unknown-disease'] },
    ]);
  });
});
