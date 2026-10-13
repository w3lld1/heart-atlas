import type { PresetId } from '@heart-atlas/heart-clock';
import type { Vec3 } from './camera.ts';

// Shapes of disease on the normal heart model: docs/plans/2026-10-12-disease-signs-3d.md. Every
// sign comes from a source already checked in the disease article (`article`, its Cite number) or
// opened for the spec (`extra`, shown under the model). Sizes no source gives are assumptions.

export const diseaseIds = [
  'heart-failure',
  'atrial-fibrillation',
  'coronary-heart-disease',
  'hypertension',
  'aortic-stenosis',
  'hypertrophic-cardiomyopathy',
  'dilated-cardiomyopathy',
  'atrial-septal-defect',
] as const;

export type DiseaseId = (typeof diseaseIds)[number];

export const isDiseaseId = (value: unknown): value is DiseaseId =>
  (diseaseIds as readonly unknown[]).includes(value);

/** A part of the left ventricle wall, weighted by distance to a mesh the model already has. */
export type ZoneKind = 'inferior' | 'septal';

export interface DiseaseSource {
  label: string;
  url: string;
}

export interface DiseaseShape {
  /** Meshes lit with the disease colour. */
  tint?: string[];
  /** A coloured zone of the left ventricle; `motion` scales its contraction (1 = normal). */
  zone?: { kind: ZoneKind; motion: number };
  /** The left ventricle grows about its own centre by `scale`; `with` meshes move along. */
  enlarge?: { scale: number; with: string[] };
  /** Multiplies how far the aortic valve opens. */
  aorticOpening?: number;
  /** Zone id that gets a marker next to it. */
  marker?: string;
  /**
   * A sign seen only while the heart beats: `true` when the viewer draws it (zone motion, valve),
   * a preset id when it comes from the heart clock running that preset.
   */
  beat?: true | PresetId;
  /** How the sign was sourced; `extra` sources are shown under the model. */
  sources: { article: number[]; extra?: DiseaseSource[] };
}

const LV = 'left-ventricle';

export const diseaseShapes: Record<DiseaseId, DiseaseShape> = {
  // Weak contraction and resting atria come from the heart clock preset itself.
  'heart-failure': { beat: 'heart-failure', sources: { article: [] } },
  'atrial-fibrillation': { beat: 'atrial-fibrillation', sources: { article: [] } },
  'coronary-heart-disease': {
    beat: true,
    // assumption: how much less the zone moves; the source says only that its motion is abnormal.
    zone: { kind: 'inferior', motion: 0.3 },
    sources: {
      article: [2],
      extra: [
        {
          label: 'StatPearls: Inferior Myocardial Infarction',
          url: 'https://www.statpearls.com/point-of-care/23500',
        },
        {
          label: 'StatPearls: Acute Myocardial Infarction',
          url: 'https://www.ncbi.nlm.nih.gov/books/NBK459269/',
        },
      ],
    },
  },
  // The model's ventricles are cavity surfaces, so a thick wall is shown by colour, not by shape.
  hypertension: { tint: [LV], sources: { article: [2] } },
  // assumption: the share of the normal opening; the model does not compute the valve area.
  'aortic-stenosis': { aorticOpening: 0.4, beat: true, sources: { article: [3] } },
  'hypertrophic-cardiomyopathy': {
    tint: [LV],
    zone: { kind: 'septal', motion: 1 },
    sources: { article: [2, 3] },
  },
  'dilated-cardiomyopathy': {
    // assumption: the size, kept small enough not to cut into the right ventricle.
    enlarge: { scale: 1.15, with: ['left-papillary-muscles', 'mitral-valve'] },
    tint: [LV],
    beat: 'heart-failure',
    sources: { article: [1, 2] },
  },
  'atrial-septal-defect': { marker: 'interatrial-septum', sources: { article: [1] } },
};

/** Whether the shape changes the model at rest, so its still caption applies without a heartbeat. */
export const hasStillSigns = (shape: DiseaseShape): boolean =>
  Boolean(shape.tint ?? shape.zone ?? shape.enlarge ?? shape.marker);

/** Shape shown for each heart clock preset on a page that follows the clock. */
export const presetShape: Record<PresetId, DiseaseId | null> = {
  normal: null,
  'atrial-fibrillation': 'atrial-fibrillation',
  stemi: 'coronary-heart-disease',
  'heart-failure': 'heart-failure',
  hypertension: 'hypertension',
  'aortic-stenosis': 'aortic-stenosis',
  'atrial-septal-defect': 'atrial-septal-defect',
  'av-block-first-degree': null,
  'supraventricular-tachycardia': null,
  'long-qt-syndrome': null,
  'ventricular-tachycardia': null,
  'atrial-flutter': null,
  'sick-sinus-syndrome': null,
  'wpw-syndrome': null,
  'brugada-syndrome': null,
};

/** What the model shows of a disease: its id, and whether its still and heartbeat captions apply. */
export interface DiseaseView {
  id: DiseaseId;
  still: boolean;
  beat: boolean;
}

/**
 * The disease a viewer shows: its own, or else the preset of the clock it follows. Heartbeat
 * signs apply while the model beats; preset signs only while the clock runs that preset.
 */
export function diseaseView(
  own: DiseaseId | undefined,
  preset: PresetId | null,
  beating: boolean,
): DiseaseView | null {
  const id = own ?? (preset ? presetShape[preset] : null);
  if (!id) return null;
  const shape = diseaseShapes[id];
  const beat = shape.beat === true ? beating : shape.beat !== undefined && shape.beat === preset;
  return { id, still: hasStillSigns(shape), beat };
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
