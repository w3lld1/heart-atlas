/**
 * Decorative body silhouette behind the heart on the home page: torso outline, ribs, spine and
 * branching arteries and veins. Computed at build time from a fixed seed, so every build gives
 * the same SVG and the page needs no JavaScript for it. The vessel tree is a drawing, not anatomy:
 * it does not claim to show where the vessels of the body run.
 */

export const BODY_WIDTH = 820;
export const BODY_HEIGHT = 900;
const MIDDLE = BODY_WIDTH / 2;

/** Vessels of one stroke width, merged into one path so the SVG stays small. */
export interface VesselPath {
  d: string;
  width: number;
  opacity: number;
}

/** Merges segments with the same width and opacity, thickest first. */
function merge(segments: VesselPath[]): VesselPath[] {
  const groups = new Map<string, VesselPath>();
  for (const s of segments) {
    const key = `${s.width}/${s.opacity}`;
    const group = groups.get(key);
    if (group) group.d += s.d;
    else groups.set(key, { ...s });
  }
  return [...groups.values()].sort((a, b) => b.width - a.width);
}

export interface BodyArt {
  silhouette: string;
  ribs: string[];
  spine: string;
  arteries: VesselPath[];
  veins: VesselPath[];
  /** Main trunks, drawn from the heart outwards, along which the blood flow animation runs. */
  trunks: { d: string; vein: boolean }[];
}

/** Park–Miller generator: small, deterministic and good enough for a drawing. */
function random(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

const round = (n: number): string => n.toFixed(1);

/** Mirrors every "x y" pair of a path around the vertical middle line. */
function mirror(d: string): string {
  return d.replace(
    /(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g,
    (_, x: string, y: string) => `${BODY_WIDTH - Number(x)} ${y}`,
  );
}

// Left half of the torso with neck, shoulders and the start of the arms, from the neck down.
const HALF_TORSO =
  'M410 0 L372 0 C370 40 366 80 352 104 C320 120 250 128 196 150 C150 168 128 206 118 262 ' +
  'C108 330 100 420 96 520 L92 900 L172 900 C176 760 182 620 196 520 C206 600 214 700 222 900';
// Right half, drawn upwards from the bottom, written in left-half coordinates and mirrored.
const HALF_TORSO_BACK =
  'C214 700 206 600 196 520 C182 620 176 760 172 900 L92 900 L96 520 C100 420 108 330 118 262 ' +
  'C128 206 150 168 196 150 C250 128 320 120 352 104 C366 80 370 40 372 0 Z';

type Seed = [x: number, y: number, angle: number, length: number, width: number, depth: number];

// [kind, trunk path, branch seeds]
const TRUNKS: [kind: 'artery' | 'vein', d: string, seeds: Seed[]][] = [
  [
    'artery',
    'M418 380 C418 300 470 290 452 330 C440 360 436 420 436 900',
    [
      [436, 520, 2.2, 60, 2.4, 5],
      [436, 640, 0.9, 70, 2.4, 5],
      [436, 760, 2.3, 70, 2.2, 5],
      [436, 760, 0.8, 70, 2.2, 5],
    ],
  ],
  ['artery', 'M440 300 C420 220 400 120 396 0', [[398, 120, -2.6, 50, 1.6, 4]]],
  ['artery', 'M448 300 C470 230 470 110 440 0', [[452, 140, -0.5, 50, 1.6, 4]]],
  [
    'artery',
    'M432 300 C380 240 260 210 190 250 C150 280 130 380 126 520',
    [
      [190, 250, 2.1, 70, 2.2, 5],
      [140, 360, 1.9, 70, 2, 5],
      [128, 500, 1.6, 60, 1.8, 4],
    ],
  ],
  [
    'artery',
    'M454 300 C500 240 560 210 630 250 C670 280 690 380 694 520',
    [
      [630, 250, 1.0, 70, 2.2, 5],
      [680, 360, 1.2, 70, 2, 5],
      [692, 500, 1.5, 60, 1.8, 4],
    ],
  ],
  [
    'vein',
    'M396 380 C392 330 390 300 392 260 C394 200 376 120 370 0',
    [[376, 120, -2.4, 50, 1.6, 4]],
  ],
  [
    'vein',
    'M392 300 C350 250 250 228 180 268 C140 300 118 400 112 540',
    [
      [180, 270, 2.3, 60, 2, 5],
      [120, 420, 1.8, 60, 1.8, 4],
    ],
  ],
  [
    'vein',
    'M400 300 C450 260 570 228 640 268 C680 300 702 400 708 540',
    [
      [640, 270, 0.8, 60, 2, 5],
      [700, 420, 1.3, 60, 1.8, 4],
    ],
  ],
  [
    'vein',
    'M398 420 C396 520 392 640 388 900',
    [
      [390, 600, 2.4, 70, 2.2, 5],
      [389, 720, 0.7, 70, 2, 5],
    ],
  ],
];

export function bodyArt(seed = 7): BodyArt {
  const next = random(seed);
  const arteries: VesselPath[] = [];
  const veins: VesselPath[] = [];

  // Recursive branches: each one bends a little and splits into thinner, shorter branches.
  function branch(out: VesselPath[], ...[x, y, angle, length, width, depth]: Seed): void {
    if (depth === 0 || length < 8) return;
    const bend = (next() - 0.5) * 0.6;
    const x2 = x + Math.cos(angle) * length;
    const y2 = y + Math.sin(angle) * length;
    const cx = x + Math.cos(angle + bend) * length * 0.5;
    const cy = y + Math.sin(angle + bend) * length * 0.5;
    out.push({
      d: `M${round(x)} ${round(y)} Q${round(cx)} ${round(cy)} ${round(x2)} ${round(y2)}`,
      width: Number(width.toFixed(1)),
      opacity: Number(Math.min(1, 0.35 + width / 6).toFixed(2)),
    });
    const children = depth > 3 ? 2 : 1 + (next() > 0.4 ? 1 : 0);
    for (let i = 0; i < children; i++) {
      branch(
        out,
        x2,
        y2,
        angle + (next() - 0.5) * 1.1,
        length * (0.68 + next() * 0.12),
        width * 0.68,
        depth - 1,
      );
    }
  }

  const trunks: BodyArt['trunks'] = [];
  for (const [kind, d, seeds] of TRUNKS) {
    const out = kind === 'artery' ? arteries : veins;
    out.push({ d, width: kind === 'artery' ? 5 : 4.5, opacity: 0.9 });
    trunks.push({ d, vein: kind === 'vein' });
    for (const s of seeds) branch(out, ...s);
  }
  // Faint capillary meshes either side of the heart, where the lungs are.
  for (const [cx, side] of [
    [300, -1],
    [520, 1],
  ] as const) {
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI / 2 + side * (0.6 + next() * 0.6);
      branch(i % 2 ? arteries : veins, cx, 300 + i * 22, angle, 50, 1.2, 5);
    }
  }

  const ribs: string[] = [];
  for (let i = 0; i < 7; i++) {
    const y = 250 + i * 46;
    const w = 150 + Math.sin(i / 2) * 30;
    const left = `M${MIDDLE - 18} ${y} C${round(MIDDLE - w * 0.6)} ${y - 30} ${round(MIDDLE - w)} ${y + 10} ${round(MIDDLE - w * 1.05)} ${y + 60}`;
    ribs.push(left, mirror(left));
  }

  return {
    silhouette: `${HALF_TORSO} L598 900 ${mirror(HALF_TORSO_BACK)}`,
    ribs,
    spine: `M${MIDDLE} 230 V560`,
    arteries: merge(arteries),
    veins: merge(veins),
    trunks,
  };
}
