/**
 * Builds assets/models/heart/heart.glb from BodyParts3D element files and conduction.yaml.
 * Usage: node src/assemble.ts <dir with partof_BP3D_4.0_obj_99/*.obj>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO, type Material } from '@gltf-transform/core';
import { weld } from '@gltf-transform/functions';
import { parseConduction } from './conduction.ts';
import { parseLicenses } from './licenses.ts';
import { mergeMeshes, parseObj, type ObjMesh } from './obj.ts';
import { ellipsoid, tube, type Vec3 } from './shapes.ts';
import { parseStructures, type Group } from './structures.ts';
import { assetsDir } from './paths.ts';

/** Base colours per group, linear RGB. Kept muted so highlight colours stand out. */
const GROUP_COLORS: Record<Group, [number, number, number]> = {
  chamber: [0.55, 0.12, 0.1],
  septum: [0.55, 0.12, 0.1],
  valve: [0.85, 0.75, 0.55],
  muscle: [0.45, 0.08, 0.08],
  artery: [0.7, 0.05, 0.05],
  vein: [0.12, 0.2, 0.55],
  'coronary-artery': [0.8, 0.1, 0.08],
  'cardiac-vein': [0.15, 0.25, 0.6],
  conduction: [0.95, 0.75, 0.1],
  layer: [0.55, 0.12, 0.1],
};

/**
 * BodyParts3D uses millimetres with Z up, +X to the patient's left and -Y anterior.
 * glTF uses metres with Y up and +Z towards the viewer, so a front view shows the
 * patient's left on the viewer's right, as in anatomical convention.
 */
export function toGltf(mesh: ObjMesh, origin: Vec3): Float32Array<ArrayBuffer> {
  const out = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.positions.length; i += 3) {
    const x = (mesh.positions[i] as number) - origin[0];
    const y = (mesh.positions[i + 1] as number) - origin[1];
    const z = (mesh.positions[i + 2] as number) - origin[2];
    out[i] = x / 1000;
    out[i + 1] = z / 1000;
    out[i + 2] = -y / 1000;
  }
  return out;
}

/** Reads three floats starting at `offset`. Typed-array reads past the end yield 0. */
function vec(array: Float32Array, offset: number): Vec3 {
  return [array[offset] ?? 0, array[offset + 1] ?? 0, array[offset + 2] ?? 0];
}

function boundsCenter(meshes: readonly ObjMesh[]): Vec3 {
  const min: Vec3 = [Infinity, Infinity, Infinity];
  const max: Vec3 = [-Infinity, -Infinity, -Infinity];
  for (const mesh of meshes) {
    for (let i = 0; i < mesh.positions.length; i += 3) {
      const p = vec(mesh.positions, i);
      for (let k = 0; k < 3; k++) {
        min[k] = Math.min(min[k] ?? Infinity, p[k] ?? 0);
        max[k] = Math.max(max[k] ?? -Infinity, p[k] ?? 0);
      }
    }
  }
  return [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
}

function centroid(positions: Float32Array): Vec3 {
  const sum: Vec3 = [0, 0, 0];
  for (let i = 0; i < positions.length; i += 3) {
    const p = vec(positions, i);
    sum[0] += p[0];
    sum[1] += p[1];
    sum[2] += p[2];
  }
  const n = positions.length / 3;
  return [sum[0] / n, sum[1] / n, sum[2] / n];
}

/**
 * Area-weighted vertex normals. gltf-transform's normals() writes flat normals and unwelds the
 * mesh, which would triple the vertex count of this model.
 */
export function smoothNormals(
  positions: Float32Array<ArrayBuffer>,
  indices: Uint32Array<ArrayBuffer>,
): Float32Array<ArrayBuffer> {
  const out = new Float32Array(positions.length);
  for (let t = 0; t + 2 < indices.length; t += 3) {
    const corners = [indices[t] ?? 0, indices[t + 1] ?? 0, indices[t + 2] ?? 0].map((i) => i * 3);
    const [a, b, c] = corners.map((i) => vec(positions, i)) as [Vec3, Vec3, Vec3];
    const u: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const v: Vec3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n: Vec3 = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    for (const i of corners) {
      const sum = vec(out, i);
      out.set([sum[0] + n[0], sum[1] + n[1], sum[2] + n[2]], i);
    }
  }
  for (let i = 0; i < out.length; i += 3) {
    const n = vec(out, i);
    const length = Math.hypot(...n);
    // A vertex used only by degenerate triangles gets an arbitrary unit normal.
    out.set(length === 0 ? [0, 1, 0] : [n[0] / length, n[1] / length, n[2] / length], i);
  }
  return out;
}

export async function assemble(objDir: string): Promise<Uint8Array> {
  const structures = parseStructures(
    readFileSync(join(assetsDir, 'heart/structures.yaml'), 'utf8'),
  );
  const conduction = parseConduction(
    readFileSync(join(assetsDir, 'heart/conduction.yaml'), 'utf8'),
  );

  const sourceMeshes = new Map<string, ObjMesh>();
  for (const s of structures) {
    if (s.kind !== 'mesh') continue;
    if (s.elements) {
      const parts = s.elements.map((e) => parseObj(readFileSync(join(objDir, `${e}.obj`), 'utf8')));
      sourceMeshes.set(s.id, mergeMeshes(parts));
      continue;
    }
    const part = conduction.find((c) => c.id === s.id);
    if (!part) throw new Error(`${s.id}: no elements and no entry in conduction.yaml`);
    sourceMeshes.set(
      s.id,
      part.shape === 'ellipsoid'
        ? ellipsoid(part.center, part.radii)
        : mergeMeshes(part.paths.map((path) => tube(path, part.radius))),
    );
  }
  for (const c of conduction) {
    if (!structures.some((s) => s.id === c.id)) throw new Error(`${c.id}: not in structures.yaml`);
  }

  // Centre on the heart proper, so great vessels do not shift the pivot.
  const heartGroups = new Set<Group>(['chamber', 'valve', 'muscle']);
  const origin = boundsCenter(
    structures
      .filter((s) => s.kind === 'mesh' && heartGroups.has(s.group))
      .map((s) => sourceMeshes.get(s.id) as ObjMesh),
  );

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('heart');
  const materials = new Map<Group, Material>();
  const material = (group: Group): Material => {
    let m = materials.get(group);
    if (!m) {
      m = doc
        .createMaterial(group)
        .setBaseColorFactor([...GROUP_COLORS[group], 1])
        .setRoughnessFactor(0.6)
        .setMetallicFactor(0)
        .setDoubleSided(true);
      materials.set(group, m);
    }
    return m;
  };

  // First pass: transformed positions, so zones can anchor wherever they appear in the list.
  const positionsById = new Map<string, Float32Array<ArrayBuffer>>();
  for (const [id, source] of sourceMeshes) positionsById.set(id, toGltf(source, origin));

  for (const s of structures) {
    const node = doc.createNode(s.id);
    scene.addChild(node);
    if (s.kind === 'zone') {
      // Anchor between the centroids of the meshes the zone highlights.
      const points = s.meshes.map((m) => centroid(positionsById.get(m) as Float32Array));
      const anchor = points.reduce<Vec3>(
        (a, p) => [
          a[0] + p[0] / points.length,
          a[1] + p[1] / points.length,
          a[2] + p[2] / points.length,
        ],
        [0, 0, 0],
      );
      node.setTranslation(anchor).setExtras({ kind: 'zone', group: s.group, meshes: s.meshes });
      continue;
    }
    const source = sourceMeshes.get(s.id) as ObjMesh;
    const positions = positionsById.get(s.id) as Float32Array<ArrayBuffer>;
    const primitive = doc
      .createPrimitive()
      .setAttribute(
        'POSITION',
        doc.createAccessor().setType('VEC3').setArray(positions).setBuffer(buffer),
      )
      .setIndices(doc.createAccessor().setType('SCALAR').setArray(source.indices).setBuffer(buffer))
      .setMaterial(material(s.group));
    node
      .setMesh(doc.createMesh(s.id).addPrimitive(primitive))
      .setExtras({ kind: 'mesh', group: s.group, ...(s.fma ? { fma: s.fma } : {}) });
  }
  // BodyParts3D asks for its attribution word for word, so it comes from LICENSES.yaml.
  const { entries } = parseLicenses(readFileSync(join(assetsDir, 'LICENSES.yaml'), 'utf8'));
  const entry = entries.find((e) => e.file === 'heart/heart.glb');
  const credits = entry?.derived_from?.map((d) => d.attribution) ?? [];
  if (credits.length === 0) throw new Error('LICENSES.yaml has no attribution for heart/heart.glb');
  doc.getRoot().getAsset().copyright = [`Heart Atlas contributors, CC BY-SA 4.0`, ...credits].join(
    '. ',
  );

  await doc.transform(weld());
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const primitive of mesh.listPrimitives()) {
      const positions = primitive.getAttribute('POSITION')?.getArray() as Float32Array<ArrayBuffer>;
      const indices = primitive.getIndices()?.getArray() as Uint32Array<ArrayBuffer>;
      const normals = doc
        .createAccessor()
        .setType('VEC3')
        .setArray(smoothNormals(positions, indices));
      primitive.setAttribute('NORMAL', normals.setBuffer(buffer));
    }
  }
  return new NodeIO().writeBinary(doc);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const objDir = process.argv[2];
  if (!objDir) throw new Error('Usage: node src/assemble.ts <obj dir>');
  const glb = await assemble(objDir);
  const out = join(assetsDir, 'heart/heart.glb');
  writeFileSync(out, glb);
  console.log(`Wrote ${out} (${(glb.byteLength / 1024 / 1024).toFixed(2)} MB)`);
}
