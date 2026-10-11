import type { Vec3 } from './camera.ts';

import type { ChamberId, ValveId } from '@heart-atlas/heart-clock/cycle-source';

export type {
  ChamberId,
  CycleSource,
  CycleState,
  ValveId,
} from '@heart-atlas/heart-clock/cycle-source';

export const CHAMBERS: readonly ChamberId[] = [
  'right-atrium',
  'left-atrium',
  'right-ventricle',
  'left-ventricle',
];
export const VALVES: readonly ValveId[] = [
  'tricuspid-valve',
  'mitral-valve',
  'pulmonary-valve',
  'aortic-valve',
];

/**
 * How far a fully contracted chamber shrinks towards its centre. A schematic choice for
 * visibility, not anatomy: the heart clock gives ventricles at most their ejection fraction.
 */
export const SQUEEZE: Record<ChamberId, number> = {
  'right-atrium': 0.12,
  'left-atrium': 0.12,
  'right-ventricle': 0.28,
  'left-ventricle': 0.28,
};

/** Share of the way to the rim a fully open valve moves its central points. */
export const VALVE_SPREAD = 0.8;

/** Time constants of the viewer's own easing, ms: leaflets move, the conduction glow fades. */
export const VALVE_EASE_MS = 40;
export const GLOW_EASE_MS = 120;
/** Time constant of the return to rest once the heartbeat stops, ms. */
export const SETTLE_EASE_MS = 200;

/** Moves `current` towards `target` with exponential easing, frame-rate independent. */
export function ease(current: number, target: number, dtMs: number, tauMs: number): number {
  if (dtMs <= 0) return current;
  return target + (current - target) * Math.exp(-dtMs / tauMs);
}

/** Point of a chamber squeezed towards `center` by `amount` (0 keeps it, 1 collapses it). */
export function squeezePoint(p: Vec3, center: Vec3, amount: number): Vec3 {
  const k = 1 - amount;
  return [
    center[0] + (p[0] - center[0]) * k,
    center[1] + (p[1] - center[1]) * k,
    center[2] + (p[2] - center[2]) * k,
  ];
}

export interface ValveFrame {
  center: Vec3;
  /** Unit normal of the valve plane: the direction blood flows through it. */
  normal: Vec3;
  /**
   * Radius of the orifice: the 60th percentile of the points' distances from the axis within
   * the valve plane. Not the maximum, because chordae and the annulus reach far beyond it.
   */
  radius: number;
}

const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * Centre, plane normal and radius of a valve from its vertex positions. Without a given normal it
 * is the axis along which the points spread least (smallest principal component): semilunar
 * leaflets lie across the orifice, so that axis points through it. Atrioventricular valves pass
 * the atrium → ventricle axis instead, because their chordae dominate the spread.
 */
export function valveFrame(positions: ArrayLike<number>, given?: Vec3): ValveFrame {
  const n = Math.floor(positions.length / 3);
  if (n === 0) return { center: [0, 0, 0], normal: given ?? [0, 1, 0], radius: 0 };
  const at = (i: number, j: number) => positions[i * 3 + j] ?? 0;
  let cx = 0;
  let cy = 0;
  let cz = 0;
  for (let i = 0; i < n; i++) {
    cx += at(i, 0) / n;
    cy += at(i, 1) / n;
    cz += at(i, 2) / n;
  }
  const c: Vec3 = [cx, cy, cz];
  const normal = given ? unit(given) : smallestEigenvector(covariance(positions, n, c));
  const distances: number[] = [];
  for (let i = 0; i < n; i++) {
    const d: Vec3 = [at(i, 0) - cx, at(i, 1) - cy, at(i, 2) - cz];
    const h = dot(d, normal);
    distances.push(Math.hypot(d[0] - h * normal[0], d[1] - h * normal[1], d[2] - h * normal[2]));
  }
  distances.sort((a, b) => a - b);
  const radius = distances[Math.floor(0.6 * (n - 1))] ?? 0;
  return { center: c, normal, radius };
}

function unit(v: Vec3): Vec3 {
  const length = Math.hypot(...v);
  return length === 0 ? [0, 1, 0] : [v[0] / length, v[1] / length, v[2] / length];
}

/** Covariance matrix of the points about `c`, row-major. */
function covariance(positions: ArrayLike<number>, n: number, c: Vec3): number[] {
  const m = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let i = 0; i < n; i++) {
    const d = [0, 1, 2].map((j) => (positions[i * 3 + j] ?? 0) - c[j as 0 | 1 | 2]);
    for (let a = 0; a < 3; a++) {
      for (let b = 0; b < 3; b++)
        m[a * 3 + b] = (m[a * 3 + b] ?? 0) + ((d[a] ?? 0) * (d[b] ?? 0)) / n;
    }
  }
  return m;
}

/**
 * Smallest-eigenvalue eigenvector of a symmetric 3×3 matrix by power iteration on
 * (trace·I − M), whose largest eigenvector it is. Started from each axis, keeping the result with
 * the smallest Rayleigh quotient, so a start orthogonal to the answer cannot mislead it.
 */
function smallestEigenvector(m: number[]): Vec3 {
  const trace = (m[0] ?? 0) + (m[4] ?? 0) + (m[8] ?? 0);
  const s = m.map((v, i) => (i % 4 === 0 ? trace - v : -v));
  const times = (a: number[], v: Vec3): Vec3 =>
    [0, 1, 2].map(
      (r) => (a[r * 3] ?? 0) * v[0] + (a[r * 3 + 1] ?? 0) * v[1] + (a[r * 3 + 2] ?? 0) * v[2],
    ) as Vec3;
  let best: Vec3 = [0, 1, 0];
  let bestValue = Infinity;
  const starts: Vec3[] = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  for (let v of starts) {
    for (let iteration = 0; iteration < 64; iteration++) {
      const next = times(s, v);
      const length = Math.hypot(...next);
      if (length === 0) break;
      v = [next[0] / length, next[1] / length, next[2] / length];
    }
    const value = dot(v, times(m, v));
    if (value < bestValue) {
      bestValue = value;
      best = v;
    }
  }
  return best;
}

/**
 * Point of an opening valve: each point inside the orifice moves within the valve plane towards
 * its rim, by `amount` of the way, so the centre clears. Points outside stay. Mirrors the shader.
 */
export function openValvePoint(p: Vec3, frame: ValveFrame, amount: number): Vec3 {
  const d: Vec3 = [p[0] - frame.center[0], p[1] - frame.center[1], p[2] - frame.center[2]];
  const h = dot(d, frame.normal);
  const inPlane: Vec3 = [
    d[0] - h * frame.normal[0],
    d[1] - h * frame.normal[1],
    d[2] - h * frame.normal[2],
  ];
  const r = Math.hypot(...inPlane);
  if (r < 1e-9 || r >= frame.radius) return p;
  const scale = (r + amount * (frame.radius - r)) / r;
  return [
    frame.center[0] + h * frame.normal[0] + inPlane[0] * scale,
    frame.center[1] + h * frame.normal[1] + inPlane[1] * scale,
    frame.center[2] + h * frame.normal[2] + inPlane[2] * scale,
  ];
}

/**
 * GLSL for the deformation; `transformed` is three's local vertex position. A valve first opens
 * in its own frame, then every deformed mesh is squeezed with the chambers it follows.
 */
export const DEFORM_UNIFORMS = /* glsl */ `
uniform float uSqueeze;
uniform vec3 uSqueezeCenter;
uniform int uValve;
uniform float uOpen;
uniform vec3 uCenter;
uniform vec3 uNormal;
uniform float uRadius;
`;

export const DEFORM_VERTEX = /* glsl */ `
if (uValve == 1) {
  vec3 d = transformed - uCenter;
  float h = dot(d, uNormal);
  vec3 inPlane = d - h * uNormal;
  float r = length(inPlane);
  if (r > 1e-9 && r < uRadius) {
    transformed = uCenter + h * uNormal + inPlane * ((r + uOpen * (uRadius - r)) / r);
  }
}
transformed = uSqueezeCenter + (transformed - uSqueezeCenter) * (1.0 - uSqueeze);
`;
