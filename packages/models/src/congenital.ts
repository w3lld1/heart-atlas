/**
 * Prepares a congenital heart model from its NIH 3D Heart Library source files, pinned in
 * assets/models/congenital/sources.yaml, and writes assets/models/congenital/<id>.glb.
 * Usage: node src/congenital.ts <id> <source dir>   (run by hand when the sources or the parameters change)
 *
 * The sources are MRI or CT segmentations: up to hundreds of thousands of triangles per mesh,
 * unwelded, with voxel steps on the surface. A source file is a GLB with one node per layer or a
 * binary STL with one layer. The script welds the meshes, smooths the steps with a Taubin filter,
 * simplifies each mesh, drops small loose fragments, turns scanner axes into ours (Y up, +X to the
 * patient's left, +Z anterior, metres), renames nodes to project ids and centres the model on one
 * of its meshes.
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

export interface SourceFile {
  file: string;
  file_url: string;
  sha256: string;
}

export interface CongenitalSource {
  entry: string;
  files: SourceFile[];
  /**
   * Axes of the source: `gltf` is ours already; `lps` is the scanner's (+X to the patient's left,
   * +Y posterior, +Z up), as in the STL files of the Heart Library.
   */
  axes: 'gltf' | 'lps';
  /** Factor from source units to the model's, e.g. millimetres to metres with a zoom. */
  scale: number;
  /** Section the viewer and the poster open the model with: cut when the defect is inside. */
  section: 'frontal' | 'none';
  center_on: string;
  /** node: node name in a GLB source, or the file name of an STL source. */
  meshes: { node: string; id: string; keep: number }[];
}

/** Taubin filter: a shrinking step, then an inflating one, so smoothing does not shrink the mesh. */
const TAUBIN = { iterations: 30, lambda: 0.5, mu: -0.53 };
/** Pieces smaller than this share of a mesh's triangles are segmentation noise and are dropped. */
const MIN_FRAGMENT_SHARE = 0.01;
/** Largest simplification error, as a share of the mesh size. A loose cap: `keep` decides the size. */
const SIMPLIFY_ERROR = 0.01;

/** Base colours per layer, linear RGB: muscle lighter than blood, so a cut shows the wall. */
const LAYER_COLORS: Record<string, [number, number, number]> = {
  myocardium: [0.5, 0.2, 0.16],
  'blood-pool': [0.7, 0.05, 0.05],
  // In transposition the body's circuit carries oxygen-poor blood: blue, as in the diagrams.
  'systemic-circulation': [0.05, 0.14, 0.5],
  'pulmonary-circulation': [0.7, 0.05, 0.05],
};

export function parseSources(text: string): Record<string, CongenitalSource> {
  const data = parse(text) as Record<string, CongenitalSource> | null;
  if (data === null || typeof data !== 'object') throw new Error('sources.yaml must be a mapping');
  const isText = (v: unknown): v is string => typeof v === 'string' && v.length > 0;
  for (const [id, s] of Object.entries(data)) {
    const ok =
      s !== null &&
      typeof s === 'object' &&
      /^https:\/\//.test(s.entry) &&
      Array.isArray(s.files) &&
      s.files.length > 0 &&
      s.files.every(
        (f) =>
          f !== null &&
          typeof f === 'object' &&
          isText(f.file) &&
          /\.(glb|stl)$/i.test(f.file) &&
          /^https:\/\//.test(f.file_url) &&
          /^[0-9a-f]{64}$/.test(f.sha256),
      ) &&
      (s.axes === 'gltf' || s.axes === 'lps') &&
      typeof s.scale === 'number' &&
      s.scale > 0 &&
      (s.section === 'frontal' || s.section === 'none') &&
      Array.isArray(s.meshes) &&
      s.meshes.length > 0 &&
      s.meshes.every(
        (m) =>
          m !== null &&
          typeof m === 'object' &&
          isText(m.node) &&
          isText(m.id) &&
          m.keep > 0 &&
          m.keep <= 1,
      ) &&
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

function onlyPrimitive(docs: readonly Document[], node: string): Primitive {
  const found = docs
    .flatMap((doc) => doc.getRoot().listNodes())
    .filter((n) => n.getName() === node);
  const primitives = found.length === 1 ? (found[0]?.getMesh()?.listPrimitives() ?? []) : [];
  if (primitives.length !== 1) throw new Error(`source node ${node}: expected one primitive`);
  return primitives[0] as Primitive;
}

/** Reads a binary STL into a document with one node named after the file. */
export function readStl(name: string, bytes: Uint8Array): Document {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const count = bytes.byteLength >= 84 ? view.getUint32(80, true) : -1;
  if (count < 1 || bytes.byteLength !== 84 + count * 50)
    throw new Error(`${name}: not a binary STL`);
  const positions = new Float32Array(count * 9);
  for (let t = 0; t < count; t++) {
    // Each record: normal (3 floats), three vertices (9 floats), attribute bytes (uint16).
    for (let k = 0; k < 9; k++)
      positions[t * 9 + k] = view.getFloat32(84 + t * 50 + 12 + k * 4, true);
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  const primitive = doc
    .createPrimitive()
    .setAttribute(
      'POSITION',
      doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer),
    );
  doc
    .createScene()
    .addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(primitive)));
  return doc;
}

/** Turns positions from the source axes into ours and scales them, in place. */
export function toModelAxes(positions: Float32Array, axes: 'gltf' | 'lps', scale: number): void {
  for (let i = 0; i + 2 < positions.length; i += 3) {
    const [x, y, z] = [positions[i] ?? 0, positions[i + 1] ?? 0, positions[i + 2] ?? 0];
    // LPS to ours: left stays +X, superior becomes +Y, posterior becomes -Z.
    const [ox, oy, oz] = axes === 'lps' ? [x, z, -y] : [x, y, z];
    positions[i] = ox * scale;
    positions[i + 1] = oy * scale;
    positions[i + 2] = oz * scale;
  }
}

export async function prepare(
  id: string,
  sourceFiles: Readonly<Record<string, Uint8Array>>,
): Promise<Uint8Array> {
  const source = parseSources(readFileSync(join(assetsDir, 'congenital/sources.yaml'), 'utf8'))[id];
  if (!source) throw new Error(`sources.yaml has no ${id}`);
  const structures = parseStructures(
    readFileSync(join(assetsDir, `congenital/${id}.structures.yaml`), 'utf8'),
  );
  const ids = source.meshes.map((m) => m.id).sort();
  const expected = structures.map((s) => s.id).sort();
  if (ids.join() !== expected.join())
    throw new Error(`${id}: meshes must be ${expected.join(', ')}`);

  await MeshoptSimplifier.ready;
  const inputs: Document[] = [];
  for (const file of source.files) {
    const bytes = sourceFiles[file.file];
    if (!bytes) throw new Error(`source file ${file.file} is missing`);
    const hash = createHash('sha256').update(bytes).digest('hex');
    if (hash !== file.sha256)
      throw new Error(`${file.file}: sha256 ${hash}, expected ${file.sha256}`);
    inputs.push(
      /\.stl$/i.test(file.file) ? readStl(file.file, bytes) : await new NodeIO().readBinary(bytes),
    );
  }
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(id);
  const prepared: {
    id: string;
    positions: Float32Array<ArrayBuffer>;
    indices: Uint32Array<ArrayBuffer>;
  }[] = [];

  for (const mesh of source.meshes) {
    const primitive = onlyPrimitive(inputs, mesh.node);
    // Normals differ at every corner of the unwelded source; without them weld joins by position.
    primitive.setAttribute('NORMAL', null);
  }
  for (const input of inputs) await input.transform(weld());
  for (const mesh of source.meshes) {
    const primitive = onlyPrimitive(inputs, mesh.node);
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
    const kept = dropFragments(
      primitive.getAttribute('POSITION')?.getArray() as Float32Array,
      primitive.getIndices()?.getArray() as Uint16Array | Uint32Array,
    );
    toModelAxes(kept.positions, source.axes, source.scale);
    prepared.push({ id: mesh.id, ...kept });
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
  // A model made of several source files has one record per file, all with the same attribution.
  doc.getRoot().getAsset().copyright = [
    'Heart Atlas contributors, CC BY-SA 4.0',
    ...new Set(credits.map((d) => d.attribution)),
  ].join('. ');
  return new NodeIO().writeBinary(doc);
}

const script = process.argv[1];
// realpath on both sides, as in build.ts: argv keeps symlinks, import.meta.url does not.
if (script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(import.meta.url))) {
  const [id, sourceDir] = process.argv.slice(2);
  if (!id || !sourceDir) throw new Error('Usage: node src/congenital.ts <id> <source dir>');
  const source = parseSources(readFileSync(join(assetsDir, 'congenital/sources.yaml'), 'utf8'))[id];
  if (!source) throw new Error(`sources.yaml has no ${id}`);
  const files = Object.fromEntries(
    source.files.map((f) => [f.file, new Uint8Array(readFileSync(join(sourceDir, f.file)))]),
  );
  const glb = await prepare(id, files);
  const out = join(assetsDir, `congenital/${id}.glb`);
  writeFileSync(out, glb);
  console.log(`Wrote ${out} (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}
