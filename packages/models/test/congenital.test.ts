import { describe, expect, it } from 'vitest';
import { dropFragments, parseSources, readStl, taubin, toModelAxes } from '../src/congenital.ts';

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
  files:
    - { file: a.glb, file_url: https://example.org/f, sha256: ${'a'.repeat(64)} }
  axes: gltf
  scale: 1
  section: none
  center_on: x
  meshes:
    - { node: X, id: x, keep: 0.5 }
`;

  it('accepts a complete entry', () => {
    expect(Object.keys(parseSources(valid))).toEqual(['m']);
  });

  it('rejects unknown axes, a bad scale or section, or a file that is neither GLB nor STL', () => {
    expect(() => parseSources(valid.replace('axes: gltf', 'axes: ras'))).toThrow('m is incomplete');
    expect(() => parseSources(valid.replace('scale: 1', 'scale: 0'))).toThrow('m is incomplete');
    expect(() => parseSources(valid.replace('section: none', 'section: side'))).toThrow(
      'm is incomplete',
    );
    expect(() => parseSources(valid.replace('a.glb', 'a.obj'))).toThrow('m is incomplete');
  });

  it('rejects a null file entry as incomplete', () => {
    expect(() => parseSources(valid.replace(/files:\n.*\n/, 'files: [~]\n'))).toThrow(
      'm is incomplete',
    );
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

describe('readStl', () => {
  it('reads the triangles of a binary STL into one node named after the file', () => {
    const bytes = new Uint8Array(84 + 50);
    const view = new DataView(bytes.buffer);
    view.setUint32(80, 1, true);
    [0, 0, 0, 1, 0, 0, 0, 1, 0].forEach((v, k) => view.setFloat32(96 + k * 4, v, true));
    const doc = readStl('a.stl', bytes);
    const node = doc.getRoot().listNodes()[0];
    expect(node?.getName()).toBe('a.stl');
    const position = node?.getMesh()?.listPrimitives()[0]?.getAttribute('POSITION');
    expect(Array.from(position?.getArray() ?? [])).toEqual([0, 0, 0, 1, 0, 0, 0, 1, 0]);
  });

  it('rejects a file whose size does not match its triangle count', () => {
    const bytes = new Uint8Array(84 + 49);
    new DataView(bytes.buffer).setUint32(80, 1, true);
    expect(() => readStl('a.stl', bytes)).toThrow('not a binary STL');
  });
});

describe('toModelAxes', () => {
  it('turns scanner axes into ours and scales', () => {
    // Left, posterior, superior: one unit each.
    const positions = new Float32Array([1, 2, 3]);
    toModelAxes(positions, 'lps', 2);
    expect(Array.from(positions)).toEqual([2, 6, -4]);
  });

  it('rotates without mirroring, so triangles keep their winding', () => {
    const tri = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    toModelAxes(tri, 'lps', 1);
    const [a, b, c] = [0, 3, 6].map((i) => Array.from(tri.slice(i, i + 3)));
    const u = [0, 1, 2].map((k) => (b?.[k] ?? 0) - (a?.[k] ?? 0));
    const v = [0, 1, 2].map((k) => (c?.[k] ?? 0) - (a?.[k] ?? 0));
    const normal = [
      (u[1] ?? 0) * (v[2] ?? 0) - (u[2] ?? 0) * (v[1] ?? 0),
      (u[2] ?? 0) * (v[0] ?? 0) - (u[0] ?? 0) * (v[2] ?? 0),
      (u[0] ?? 0) * (v[1] ?? 0) - (u[1] ?? 0) * (v[0] ?? 0),
    ];
    // The source normal +Z (superior) must become +Y, not -Y.
    expect(normal.map((n) => n + 0)).toEqual([0, 1, 0]);
  });

  it('only scales positions already in our axes', () => {
    const positions = new Float32Array([1, 2, 3]);
    toModelAxes(positions, 'gltf', 0.5);
    expect(Array.from(positions)).toEqual([0.5, 1, 1.5]);
  });
});
