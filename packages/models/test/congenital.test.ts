import { describe, expect, it } from 'vitest';
import { dropFragments, parseSources, taubin } from '../src/congenital.ts';

describe('taubin', () => {
  it('pulls a spike back towards its neighbours and leaves isolated vertices alone', () => {
    // A square fan around vertex 4, which sticks out of the plane; vertex 5 is in no triangle.
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 0.5, 0.5, 1, 9, 9, 9]);
    const indices = new Uint32Array([0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4]);
    taubin(positions, indices, { iterations: 3, lambda: 0.5, mu: -0.53 });
    expect(positions[14]).toBeLessThan(0.5);
    expect(Array.from(positions.slice(15))).toEqual([9, 9, 9]);
  });
});

describe('parseSources', () => {
  const valid = `
m:
  entry: https://example.org/e
  file: a.glb
  file_url: https://example.org/f
  sha256: ${'a'.repeat(64)}
  center_on: x
  meshes:
    - { node: X, id: x, keep: 0.5 }
`;

  it('accepts a complete entry', () => {
    expect(Object.keys(parseSources(valid))).toEqual(['m']);
  });

  it('rejects a bad hash, keep share or centre mesh', () => {
    expect(() => parseSources(valid.replace('a'.repeat(64), 'abc'))).toThrow('m is incomplete');
    expect(() => parseSources(valid.replace('keep: 0.5', 'keep: 2'))).toThrow('m is incomplete');
    expect(() => parseSources(valid.replace('center_on: x', 'center_on: y'))).toThrow(
      'm is incomplete',
    );
  });
});

describe('dropFragments', () => {
  it('drops small loose pieces and their vertices', () => {
    // Ten triangles in a strip, plus one loose triangle far away.
    const strip = Array.from({ length: 12 }, (_, i) => [i, i % 2, 0]).flat();
    const positions = new Float32Array([...strip, 50, 50, 50, 51, 50, 50, 50, 51, 50]);
    const indices = new Uint32Array([
      ...Array.from({ length: 10 }, (_, i) => [i, i + 1, i + 2]).flat(),
      12,
      13,
      14,
    ]);
    const out = dropFragments(positions, indices, 0.2);
    expect(out.indices.length).toBe(30);
    expect(out.positions.length).toBe(36);
    expect(Math.max(...out.positions)).toBe(11);
  });
});
