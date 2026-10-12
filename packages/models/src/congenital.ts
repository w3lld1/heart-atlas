/**
 * Prepares a congenital heart model from its NIH 3D Heart Library source GLB, pinned in
 * assets/models/congenital/sources.yaml, and writes assets/models/congenital/<id>.glb.
 * Usage: node src/congenital.ts <id> <source glb>   (run by hand when the source or the parameters change)
 *
 * The sources are MRI segmentations: hundreds of thousands of triangles per mesh, unwelded, with
 * voxel steps on the surface. The script welds them, smooths the steps with a Taubin filter,
 * simplifies each mesh, drops small loose fragments, renames nodes to project ids and centres the model on one of its meshes.
 * Their axes already match glTF and the stage 1 heart (Y up, +X to the patient's left, +Z anterior),
 * so nothing is rotated.
 */
import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, type Primitive } from '@gltf-transform/core';
import { simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import { parse } from 'yaml';
import { smoothNormals } from './assemble.ts';
import { parseLicenses } from './licenses.ts';
import { assetsDir } from './paths.ts';
import { parseStructures } from './structures.ts';

export interface CongenitalSource {
  entry: string;
  file: string;
  file_url: string;
  sha256: string;
  center_on: string;
  meshes: { node: string; id: string; keep: number }[];
}

/** Taubin filter: a shrinking step, then an inflating one, so smoothing does not shrink the mesh. */
const TAUBIN = { iterations: 30, lambda: 0.5, mu: -0.53 };
/** Pieces smaller than this share of a mesh's triangles are segmentation noise and are dropped. */
const MIN_FRAGMENT_SHARE = 0.01;
/** Largest simplification error, as a share of the mesh size. A loose cap: `keep` decides the size. */
const SIMPLIFY_ERROR = 0.01;

/** Base colours per layer, linear RGB, in the same muted range as the stage 1 heart. */
const LAYER_COLORS: Record<string, [number, number, number]> = {
  myocardium: [0.45, 0.08, 0.08],
  'blood-pool': [0.7, 0.05, 0.05],
  lungs: [0.45, 0.55, 0.7],
};

export function parseSources(text: string): Record<string, CongenitalSource> {
  const data = parse(text) as Record<string, CongenitalSource> | null;
  if (data === null || typeof data !== 'object') throw new Error('sources.yaml must be a mapping');
  const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  for (const [id, s] of Object.entries(data)) {
    const ok =
      s !== null &&
      typeof s === 'object' &&
      isText(s.file) &&
      /^https:\/\//.test(s.entry) &&
      /^https:\/\//.test(s.file_url) &&
      /^[0-9a-f]{64}$/.test(s.sha256) &&
      Array.isArray(s.meshes) &&
      s.meshes.length > 0 &&
      s.meshes.every((m) => isText(m.node) && isText(m.id) && m.keep > 0 && m.keep <= 1) &&
      s.meshes.some((m) => m.id === s.center_on);
    if (!ok) throw new Error(`sources.yaml: ${id} is incomplete`);
  }
  return data;
}

/**
 * Smooths an indexed triangle mesh in place with uniform neighbour weights. A neighbour shared by
 * two triangles is counted twice, which weighs every interior edge the same.
 */
export function taubin(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  { iterations, lambda, mu } = TAUBIN,
): void {
  const count = positions.length / 3;
  const degree = new Uint32Array(count + 1);
  for (const i of indices) degree[i + 1] = (degree[i + 1] ?? 0) + 2;
  for (let v = 0; v < count; v++) degree[v + 1] = (degree[v + 1] ?? 0) + (degree[v] ?? 0);
  const start = degree.slice();
  const neighbours = new Uint32Array(indices.length * 2);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const tri = [indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0];
    for (let k = 0; k < 3; k++) {
      const v = tri[k] ?? 0;
      const at = start[v] ?? 0;
      neighbours[at] = tri[(k + 1) % 3] ?? 0;
      neighbours[at + 1] = tri[(k + 2) % 3] ?? 0;
      start[v] = at + 2;
    }
  }
  let current = positions.slice();
  let next = positions.slice();
  for (let it = 0; it < iterations; it++) {
    for (const factor of [lambda, mu]) {
      for (let v = 0; v < count; v++) {
        const from = degree[v] ?? 0;
        const to = degree[v + 1] ?? 0;
        if (to === from) continue;
        let x = 0;
        let y = 0;
        let z = 0;
        for (let n = from; n < to; n++) {
          const u = (neighbours[n] ?? 0) * 3;
          x += current[u] ?? 0;
          y += current[u + 1] ?? 0;
          z += current[u + 2] ?? 0;
        }
        const k = to - from;
        const i = v * 3;
        const [cx, cy, cz] = [current[i] ?? 0, current[i + 1] ?? 0, current[i + 2] ?? 0];
        next[i] = cx + factor * (x / k - cx);
        next[i + 1] = cy + factor * (y / k - cy);
        next[i + 2] = cz + factor * (z / k - cz);
      }
      [current, next] = [next, current];
    }
  }
  positions.set(current);
}

/**
 * Drops connected pieces with fewer than `minShare` of the mesh's triangles and the vertices only
 * they used. Returns compact arrays.
 */
export function dropFragments(
  positions: Float32Array,
  indices: Uint16Array | Uint32Array,
  minShare = MIN_FRAGMENT_SHARE,
): { positions: Float32Array<ArrayBuffer>; indices: Uint32Array<ArrayBuffer> } {
  const parent = Int32Array.from({ length: positions.length / 3 }, (_, i) => i);
  const root = (v: number): number => {
    let r = v;
    while (parent[r] !== r) r = parent[r] ?? r;
    while (parent[v] !== r) {
      const next = parent[v] ?? r;
      parent[v] = r;
      v = next;
    }
    return r;
  };
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const a = root(indices[t] ?? 0);
    parent[root(indices[t + 1] ?? 0)] = a;
    parent[root(indices[t + 2] ?? 0)] = a;
  }
  const size = new Map<number, number>();
  for (let t = 0; t < indices.length; t += 3) {
    const r = root(indices[t] ?? 0);
    size.set(r, (size.get(r) ?? 0) + 1);
  }
  const min = (minShare * indices.length) / 3;
  const remap = new Int32Array(positions.length / 3).fill(-1);
  const keptPositions: number[] = [];
  const keptIndices: number[] = [];
  for (let t = 0; t + 2 < indices.length; t += 3) {
    if ((size.get(root(indices[t] ?? 0)) ?? 0) < min) continue;
    for (let k = 0; k < 3; k++) {
      const v = indices[t + k] ?? 0;
      if (remap[v] === -1) {
        remap[v] = keptPositions.length / 3;
        keptPositions.push(
          positions[v * 3] ?? 0,
          positions[v * 3 + 1] ?? 0,
          positions[v * 3 + 2] ?? 0,
        );
      }
      keptIndices.push(remap[v] ?? 0);
    }
  }
  return { positions: Float32Array.from(keptPositions), indices: Uint32Array.from(keptIndices) };
}

function bounds(positions: Float32Array): { min: number[]; max: number[] } {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let k = 0; k < 3; k++) {
      const p = positions[i + k] ?? 0;
      min[k] = Math.min(min[k] ?? Infinity, p);
      max[k] = Math.max(max[k] ?? -Infinity, p);
    }
  }
  return { min, max };
}

function onlyPrimitive(doc: Document, node: string): Primitive {
  const found = doc
    .getRoot()
    .listNodes()
    .find((n) => n.getName() === node);
  const primitives = found?.getMesh()?.listPrimitives() ?? [];
  if (primitives.length !== 1) throw new Error(`source node ${node}: expected one primitive`);
  return primitives[0] as Primitive;
}

export async function prepare(id: string, sourceBytes: Uint8Array): Promise<Uint8Array> {
  const source = parseSources(readFileSync(join(assetsDir, 'congenital/sources.yaml'), 'utf8'))[id];
  if (!source) throw new Error(`sources.yaml has no ${id}`);
  const hash = createHash('sha256').update(sourceBytes).digest('hex');
  if (hash !== source.sha256) throw new Error(`source sha256 ${hash}, expected ${source.sha256}`);
  const structures = parseStructures(
    readFileSync(join(assetsDir, 'congenital/structures.yaml'), 'utf8'),
  );
  const ids = source.meshes.map((m) => m.id).sort();
  const expected = structures.map((s) => s.id).sort();
  if (ids.join() !== expected.join())
    throw new Error(`${id}: meshes must be ${expected.join(', ')}`);

  await MeshoptSimplifier.ready;
  const input = await new NodeIO().readBinary(sourceBytes);
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(id);
  const prepared: {
    id: string;
    positions: Float32Array<ArrayBuffer>;
    indices: Uint32Array<ArrayBuffer>;
  }[] = [];

  for (const mesh of source.meshes) {
    const primitive = onlyPrimitive(input, mesh.node);
    // Normals differ at every corner of the unwelded source; without them weld joins by position.
    primitive.setAttribute('NORMAL', null);
  }
  await input.transform(weld());
  for (const mesh of source.meshes) {
    const primitive = onlyPrimitive(input, mesh.node);
    const position = primitive.getAttribute('POSITION');
    const index = primitive.getIndices();
    if (!position || !index) throw new Error(`source node ${mesh.node}: no indexed positions`);
    // In place: the accessor keeps the smoothed array.
    taubin(position.getArray() as Float32Array, index.getArray() as Uint16Array | Uint32Array);
    simplifyPrimitive(primitive, {
      simplifier: MeshoptSimplifier,
      ratio: mesh.keep,
      error: SIMPLIFY_ERROR,
    });
    prepared.push({
      id: mesh.id,
      ...dropFragments(
        primitive.getAttribute('POSITION')?.getArray() as Float32Array,
        primitive.getIndices()?.getArray() as Uint16Array | Uint32Array,
      ),
    });
  }

  const center = prepared.find((p) => p.id === source.center_on) as (typeof prepared)[number];
  const { min, max } = bounds(center.positions);
  const origin = [0, 1, 2].map((k) => ((min[k] ?? 0) + (max[k] ?? 0)) / 2);
  for (const s of structures) {
    const p = prepared.find((m) => m.id === s.id) as (typeof prepared)[number];
    for (let i = 0; i < p.positions.length; i++)
      p.positions[i] = (p.positions[i] ?? 0) - (origin[i % 3] ?? 0);
    const { indices } = p;
    const material = doc
      .createMaterial(s.id)
      .setBaseColorFactor([...(LAYER_COLORS[s.id] ?? [0.5, 0.5, 0.5]), 1])
      .setRoughnessFactor(0.6)
      .setMetallicFactor(0)
      .setDoubleSided(true);
    const accessor = (
      type: 'VEC3' | 'SCALAR',
      array: Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>,
    ) => doc.createAccessor().setType(type).setArray(array).setBuffer(buffer);
    const primitive = doc
      .createPrimitive()
      .setAttribute('POSITION', accessor('VEC3', p.positions))
      .setAttribute('NORMAL', accessor('VEC3', smoothNormals(p.positions, indices)))
      .setIndices(accessor('SCALAR', indices))
      .setMaterial(material);
    scene.addChild(
      doc
        .createNode(s.id)
        .setMesh(doc.createMesh(s.id).addPrimitive(primitive))
        .setExtras({ kind: 'mesh', group: s.group }),
    );
  }

  const { entries } = parseLicenses(readFileSync(join(assetsDir, 'LICENSES.yaml'), 'utf8'));
  const credits = entries.find((e) => e.file === `congenital/${id}.glb`)?.derived_from ?? [];
  if (credits.length === 0)
    throw new Error(`LICENSES.yaml has no attribution for congenital/${id}.glb`);
  doc.getRoot().getAsset().copyright = [
    'Heart Atlas contributors, CC BY-SA 4.0',
    ...credits.map((d) => d.attribution),
  ].join('. ');
  return new NodeIO().writeBinary(doc);
}

const script = process.argv[1];
// realpath on both sides, as in build.ts: argv keeps symlinks, import.meta.url does not.
if (script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(import.meta.url))) {
  const [id, sourcePath] = process.argv.slice(2);
  if (!id || !sourcePath) throw new Error('Usage: node src/congenital.ts <id> <source glb>');
  const glb = await prepare(id, readFileSync(sourcePath));
  const out = join(assetsDir, `congenital/${id}.glb`);
  writeFileSync(out, glb);
  console.log(`Wrote ${out} (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}
