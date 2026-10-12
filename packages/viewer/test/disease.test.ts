import { presetIds } from '@heart-atlas/heart-clock';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  diseaseIds,
  diseaseShapes,
  isDiseaseId,
  nearestDistances,
  presetShape,
  zoneWeight,
} from '../src/disease.ts';

describe('zoneWeight', () => {
  it('is 1 near, 0 far and falls smoothly in between', () => {
    expect(zoneWeight(0.005, 0.01, 0.02)).toBe(1);
    expect(zoneWeight(0.03, 0.01, 0.02)).toBe(0);
    expect(zoneWeight(0.015, 0.01, 0.02)).toBeCloseTo(0.5);
    expect(zoneWeight(0.012, 0.01, 0.02)).toBeGreaterThan(zoneWeight(0.018, 0.01, 0.02));
  });
});

describe('nearestDistances', () => {
  it('finds the nearest target and caps distances at the cell size', () => {
    const targets = [0, 0, 0, 1, 0, 0];
    const points = [0.9, 0, 0, 0, 0.3, 0, 5, 5, 5, -0.1, -0.1, 0];
    const d = nearestDistances(points, targets, 0.5);
    expect(d[0]).toBeCloseTo(0.1);
    expect(d[1]).toBeCloseTo(0.3);
    expect(d[2]).toBe(0.5);
    expect(d[3]).toBeCloseTo(Math.SQRT2 * 0.1);
  });
});

describe('disease shapes', () => {
  it('maps every heart clock preset to a known shape or none', () => {
    for (const preset of presetIds) {
      const shape = presetShape[preset];
      expect(shape === null || isDiseaseId(shape)).toBe(true);
    }
    expect(presetShape.normal).toBeNull();
  });

  it('gives every drawn sign a source', () => {
    for (const id of diseaseIds) {
      const { sources, ...signs } = diseaseShapes[id];
      if (Object.keys(signs).length === 0) continue;
      expect(sources.article.length + (sources.extra?.length ?? 0), id).toBeGreaterThan(0);
    }
  });

  it('marks every number no source gives as an assumption', () => {
    const file = readFileSync(new URL('../src/disease.ts', import.meta.url), 'utf8');
    const block = file.slice(
      file.indexOf('export const diseaseShapes'),
      file.indexOf('export const presetShape'),
    );
    const lines = block.split('\n');
    lines.forEach((line, i) => {
      if (/\b(motion|scale|aorticOpening): (?!1\b)[\d.]+/.test(line)) {
        expect(lines.slice(Math.max(0, i - 2), i + 1).join('\n'), line).toMatch(/assumption/);
      }
    });
  });
});
