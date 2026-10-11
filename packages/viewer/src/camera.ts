export type Vec3 = [number, number, number];

/** Keeps the camera away from the poles, where orbit controls flip. */
const MIN_POLAR = 0.05;
const MAX_POLAR = Math.PI - 0.05;

export interface OrbitLimits {
  minDistance: number;
  maxDistance: number;
}

/**
 * Moves a camera around `target` on a sphere: `dAzimuth` turns around the vertical axis,
 * `dPolar` tilts towards the poles, `zoom` < 1 moves closer. Used for keyboard control.
 */
export function orbit(
  position: Vec3,
  target: Vec3,
  dAzimuth: number,
  dPolar: number,
  zoom: number,
  limits: OrbitLimits,
): Vec3 {
  const x = position[0] - target[0];
  const y = position[1] - target[1];
  const z = position[2] - target[2];
  const radius = Math.hypot(x, y, z);
  const azimuth = Math.atan2(x, z) + dAzimuth;
  const polar = Math.min(MAX_POLAR, Math.max(MIN_POLAR, Math.acos(y / radius) + dPolar));
  const r = Math.min(limits.maxDistance, Math.max(limits.minDistance, radius * zoom));
  return [
    target[0] + r * Math.sin(polar) * Math.sin(azimuth),
    target[1] + r * Math.cos(polar),
    target[2] + r * Math.sin(polar) * Math.cos(azimuth),
  ];
}

export interface KeyAction {
  dAzimuth: number;
  dPolar: number;
  zoom: number;
  reset?: true;
}

const STEP = Math.PI / 12;

/** Maps a keyboard key to a camera move, or null when the key is not a viewer key. */
export function keyAction(key: string): KeyAction | null {
  switch (key) {
    case 'ArrowLeft':
      return { dAzimuth: -STEP, dPolar: 0, zoom: 1 };
    case 'ArrowRight':
      return { dAzimuth: STEP, dPolar: 0, zoom: 1 };
    case 'ArrowUp':
      return { dAzimuth: 0, dPolar: -STEP, zoom: 1 };
    case 'ArrowDown':
      return { dAzimuth: 0, dPolar: STEP, zoom: 1 };
    case '+':
    case '=':
      return { dAzimuth: 0, dPolar: 0, zoom: 0.85 };
    case '-':
    case '_':
      return { dAzimuth: 0, dPolar: 0, zoom: 1 / 0.85 };
    case '0':
    case 'Home':
      return { dAzimuth: 0, dPolar: 0, zoom: 1, reset: true };
    default:
      return null;
  }
}
