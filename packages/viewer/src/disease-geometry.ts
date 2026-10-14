import type { Vec3 } from './camera.ts';
import type { ChamberId } from './cycle.ts';
import type { DiseaseShape, ZoneKind } from './disease.ts';

// Disease shape geometry that only the 3D scene uses, apart from disease.ts so the viewer island
// does not load it with the poster.

/**
 * Where the ascending aorta bulges, in metres along the aortic valve axis from the valve centre:
 * rising over x..y, falling over z..w; and the distance from the axis beyond which a point belongs
 * to another part of the aorta (reach). Measured on heart.glb: the tubular part runs from about
 * 1 to 4.5 cm above the valve with a radius of about 1.25 cm, its centreline a few millimetres
 * beside the valve axis (the viewer moves the axis onto it); the descending aorta is 6-7 cm away.
 */
export const AORTA_BULGE = { range: [0.006, 0.016, 0.036, 0.048], reach: [0.02, 0.026] } as const;

/** Meshes that grow with a chamber besides the chamber itself. */
export const GROW_WITH: Record<ChamberId, string[]> = {
  'left-ventricle': ['left-papillary-muscles', 'mitral-valve'],
  'right-ventricle': ['right-papillary-muscles', 'tricuspid-valve'],
  // Veins stay as they are: scaled with an atrium they would only turn thicker.
  'left-atrium': [],
  'right-atrium': ['sa-node', 'av-node'],
};

/** Growth of the vessels lying on the ventricles: the mean of the two ventricles. */
export const growOnVentricles = (shape: DiseaseShape | null | undefined): number =>
  ((shape?.grow?.['left-ventricle'] ?? 1) + (shape?.grow?.['right-ventricle'] ?? 1)) / 2;

/** The chamber a mesh grows with, if any. */
export function growOwner(name: string): ChamberId | undefined {
  for (const [chamber, meshes] of Object.entries(GROW_WITH) as [ChamberId, string[]][]) {
    if (chamber === name || meshes.includes(name)) return chamber;
  }
  return undefined;
}

/**
 * Distances in model space (metres) over which a zone fades from full to none. In heart.glb the
 * nearest left ventricle vertex is 7.9 mm from the right coronary artery and 2.1 mm from the right
 * ventricle (the septum between the cavities).
 */
export const ZONE_FADE: Record<ZoneKind, { near: string; full: number; none: number }> = {
  // assumption: widths for visibility. The right coronary artery usually supplies the inferior wall.
  inferior: { near: 'right-coronary-artery', full: 0.012, none: 0.02 },
  // The septal part of the left ventricle is the part next to the right ventricle.
  septal: { near: 'right-ventricle', full: 0.008, none: 0.013 },
};

/** Weight 1 within `full` of the nearest point, 0 beyond `none`, smooth in between. */
export function zoneWeight(distance: number, full: number, none: number): number {
  if (distance <= full) return 1;
  if (distance >= none) return 0;
  const t = (distance - full) / (none - full);
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Distance from each point of `points` to the nearest point of `targets` (both flat xyz). A
 * uniform grid of `cell` keeps it near linear: only targets in neighbouring cells are compared,
 * so distances beyond `cell` come back as `cell`, which is enough for a fade narrower than that.
 */
export function nearestDistances(
  points: ArrayLike<number>,
  targets: ArrayLike<number>,
  cell: number,
): Float32Array {
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number, z: number) => `${x},${y},${z}`;
  for (let i = 0; i + 2 < targets.length; i += 3) {
    const k = key(
      Math.floor((targets[i] ?? 0) / cell),
      Math.floor((targets[i + 1] ?? 0) / cell),
      Math.floor((targets[i + 2] ?? 0) / cell),
    );
    const list = grid.get(k);
    if (list) list.push(i);
    else grid.set(k, [i]);
  }
  const out = new Float32Array(Math.floor(points.length / 3));
  for (let p = 0; p < out.length; p++) {
    const point: Vec3 = [points[p * 3] ?? 0, points[p * 3 + 1] ?? 0, points[p * 3 + 2] ?? 0];
    const [cx, cy, cz] = point.map((v) => Math.floor(v / cell)) as Vec3;
    let best = cell * cell;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          for (const i of grid.get(key(cx + dx, cy + dy, cz + dz)) ?? []) {
            const d =
              ((targets[i] ?? 0) - point[0]) ** 2 +
              ((targets[i + 1] ?? 0) - point[1]) ** 2 +
              ((targets[i + 2] ?? 0) - point[2]) ** 2;
            if (d < best) best = d;
          }
        }
      }
    }
    out[p] = Math.sqrt(best);
  }
  return out;
}
