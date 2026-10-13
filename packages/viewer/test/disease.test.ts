import { presetIds } from '@heart-atlas/heart-clock';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { viewerMessageKeys } from '../src/types.ts';
import {
  diseaseIds,
  diseaseShapes,
  diseaseView,
  hasStillSigns,
  isDiseaseId,
  ZONE_FADE,
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
      const { sources, beat, ...signs } = diseaseShapes[id];
      // A sign from a clock preset is sourced in the presets spec.
      if (Object.keys(signs).length === 0 && beat !== true) continue;
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
    // A number other than a plain 1 (normal), so 1.15 counts.
    const number = /\b(motion|scale|aorticOpening): (?!1(?![\d.]))[\d.]+/;
    const hits = lines.flatMap((line, i) => (number.test(line) ? [i] : []));
    expect(hits.length).toBeGreaterThanOrEqual(3);
    for (const i of hits) {
      expect(lines.slice(Math.max(0, i - 2), i + 1).join('\n'), lines[i]).toMatch(/assumption/);
    }
  });

  it('names only structures the model has', () => {
    const root = new URL('../../../', import.meta.url);
    const yaml = readFileSync(new URL('assets/models/heart/structures.yaml', root), 'utf8');
    const ids = new Set([...yaml.matchAll(/^- id: (\S+)/gm)].map((m) => m[1]));
    const names = [
      ...diseaseIds.flatMap((id) => {
        const shape = diseaseShapes[id];
        return [...(shape.tint ?? []), ...(shape.enlarge?.with ?? []), shape.marker ?? []].flat();
      }),
      ...Object.values(ZONE_FADE).map((z) => z.near),
      'left-ventricle',
    ];
    for (const name of names) expect(ids, name).toContain(name);
  });

  it('cites sources the article has', () => {
    const root = new URL('../../../content/', import.meta.url);
    for (const id of diseaseIds) {
      for (const locale of ['en', 'ru']) {
        const text = readFileSync(new URL(`${locale}/disease/${id}.mdx`, root), 'utf8');
        const front = text.split('---')[1] ?? '';
        const count = front.match(/^ {2}- tier:/gm)?.length ?? 0;
        for (const n of diseaseShapes[id].sources.article) {
          expect(n, `${locale}/${id}`).toBeLessThanOrEqual(count);
        }
      }
    }
  });

  it('has a caption for every sign it can show', () => {
    const keys = new Set<string>(viewerMessageKeys);
    for (const id of diseaseIds) {
      const shape = diseaseShapes[id];
      if (hasStillSigns(shape)) expect(keys, id).toContain(`viewer.disease.${id}`);
      if (shape.beat) expect(keys, id).toContain(`viewer.disease.${id}.beat`);
      if (shape.marker) expect(keys, id).toContain(`viewer.disease.marker.${id}`);
    }
  });
});

describe('diseaseView', () => {
  it("prefers the viewer's own disease over the clock preset", () => {
    expect(diseaseView('hypertension', 'stemi', true)?.id).toBe('hypertension');
  });

  it('follows the preset without a disease of its own', () => {
    expect(diseaseView(undefined, 'stemi', true)).toEqual({
      id: 'coronary-heart-disease',
      still: true,
      beat: true,
    });
    expect(diseaseView(undefined, 'normal', true)).toBeNull();
    // Presets with no shape in the model: first-degree AV block, SVT, long QT syndrome, VT,
    // atrial flutter and sick sinus syndrome.
    expect(diseaseView(undefined, 'av-block-first-degree', true)).toBeNull();
    expect(diseaseView(undefined, 'supraventricular-tachycardia', true)).toBeNull();
    expect(diseaseView(undefined, 'long-qt-syndrome', true)).toBeNull();
    expect(diseaseView(undefined, 'ventricular-tachycardia', true)).toBeNull();
    expect(diseaseView(undefined, 'atrial-flutter', true)).toBeNull();
    expect(diseaseView(undefined, 'sick-sinus-syndrome', true)).toBeNull();
    expect(diseaseView(undefined, null, false)).toBeNull();
  });

  it('captions heartbeat signs only while beating and preset signs only with the preset', () => {
    expect(diseaseView('coronary-heart-disease', null, false)?.beat).toBe(false);
    expect(diseaseView('dilated-cardiomyopathy', 'heart-failure', true)).toEqual({
      id: 'dilated-cardiomyopathy',
      still: true,
      beat: true,
    });
    expect(diseaseView('dilated-cardiomyopathy', 'normal', true)?.beat).toBe(false);
    expect(diseaseView('heart-failure', null, true)).toEqual({
      id: 'heart-failure',
      still: false,
      beat: false,
    });
  });
});
