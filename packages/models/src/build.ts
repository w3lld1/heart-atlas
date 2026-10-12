/**
 * Compresses the models in MODELS into the LOD files the site loads and copies the posters.
 * Usage: node src/build.ts <output dir>   (apps/web runs it before `astro build` and `astro dev`)
 */
import {
  copyFileSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { type Document, Logger, NodeIO, type Primitive } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, simplifyPrimitive, weld } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import { assetsDir } from './paths.ts';

export interface Lod {
  /** Output file is `<model>-<name>.glb`. */
  name: string;
  /** Target share of triangles kept in meshes that are simplified. */
  ratio: number;
  maxBytes: number;
  maxTriangles: number;
}

/** Budgets from the stage 1 spec. The largest file must stay under the plan's 3 MB. */
export const LODS: readonly Lod[] = [
  { name: 'lod0', ratio: 1, maxBytes: 3 * 1024 * 1024, maxTriangles: 300_000 },
  { name: 'lod1', ratio: 0.5, maxBytes: 1.5 * 1024 * 1024, maxTriangles: 100_000 },
];

export interface Model {
  /** Prefix of the output files. */
  name: string;
  /** Source GLB, relative to assets/models/. */
  source: string;
  /** structures.yaml the model must match, relative to assets/models/. */
  structures: string;
  /**
   * Largest simplification error of the low LODs, as a share of the mesh size. Patient models are
   * already simplified close to the default limit, so they need a looser one to reach the budget.
   */
  simplifyError?: number;
}

export const MODELS: readonly Model[] = [
  { name: 'heart', source: 'heart/heart.glb', structures: 'heart/structures.yaml' },
  {
    name: 'tetralogy-of-fallot',
    source: 'congenital/tetralogy-of-fallot.glb',
    structures: 'congenital/structures.yaml',
    simplifyError: 0.005,
  },
];

export const lodFile = (model: Model, lod: Lod): string => `${model.name}-${lod.name}.glb`;

/** Meshes this small (conduction nodes, thin branches) are never simplified, so they keep their shape. */
const MIN_TRIANGLES_TO_SIMPLIFY = 2_000;

function primitiveTriangles(primitive: Primitive): number {
  const count =
    primitive.getIndices()?.getCount() ?? primitive.getAttribute('POSITION')?.getCount() ?? 0;
  return count / 3;
}

function triangleCount(doc: Document): number {
  return doc
    .getRoot()
    .listMeshes()
    .flatMap((m) => m.listPrimitives())
    .reduce((n, p) => n + primitiveTriangles(p), 0);
}

export async function buildLod(
  source: Uint8Array,
  lod: Lod,
  simplifyError = 0.001,
): Promise<Uint8Array> {
  await Promise.all([MeshoptEncoder.ready, MeshoptSimplifier.ready]);
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  const doc = await io.readBinary(source);
  doc.setLogger(new Logger(Logger.Verbosity.WARN));
  // No join, flatten or palette: each structure must stay a separate named node with its material.
  // keepLeaves keeps the empty anchor nodes of zones.
  await doc.transform(dedup(), prune({ keepLeaves: true, keepExtras: true }), weld());
  if (lod.ratio < 1) {
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const primitive of mesh.listPrimitives()) {
        if (primitiveTriangles(primitive) < MIN_TRIANGLES_TO_SIMPLIFY) continue;
        simplifyPrimitive(primitive, {
          simplifier: MeshoptSimplifier,
          ratio: lod.ratio,
          error: simplifyError,
          lockBorder: true,
        });
      }
    }
  }
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: 'high' }));
  const triangles = triangleCount(doc);
  if (triangles > lod.maxTriangles) {
    throw new Error(`${lod.name}: ${triangles} triangles, budget ${lod.maxTriangles}`);
  }
  const bytes = await io.writeBinary(doc);
  if (bytes.byteLength > lod.maxBytes) {
    throw new Error(`${lod.name}: ${bytes.byteLength} bytes, budget ${lod.maxBytes}`);
  }
  return bytes;
}

const script = process.argv[1];
// realpath on both sides: argv keeps symlinks, import.meta.url does not.
if (script !== undefined && realpathSync(script) === realpathSync(fileURLToPath(import.meta.url))) {
  const outDir = resolve(process.argv[2] ?? 'dist/models');
  // The directory holds only generated files; clearing it drops renamed or removed LODs.
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  for (const model of MODELS) {
    const source = readFileSync(join(assetsDir, model.source));
    for (const lod of LODS) {
      const file = lodFile(model, lod);
      const bytes = await buildLod(source, lod, model.simplifyError);
      writeFileSync(join(outDir, file), bytes);
      const kb = (n: number): string => `${(n / 1024).toFixed(0)} KB`;
      console.log(`${file}: ${kb(bytes.byteLength)} (gzip ${kb(gzipSync(bytes).byteLength)})`);
    }
  }
  copyFileSync(join(assetsDir, 'heart/poster.png'), join(outDir, 'heart-poster.png'));
  copyFileSync(join(assetsDir, 'heart/hero-poster.webp'), join(outDir, 'heart-hero-poster.webp'));
}
