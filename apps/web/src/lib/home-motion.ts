import type { MotionLevel } from './motion.ts';

/** Frames a second of the running ECG in calm motion, as in the spec. */
export const CALM_FPS = 15;

/** Whether a canvas animation draws a new frame, `sinceLast` ms after the last one it drew. */
export function frameDue(level: MotionLevel, sinceLast: number): boolean {
  if (level === 'full') return true;
  // Half a frame of slack, so a 60 Hz screen settles on every fourth frame rather than every fifth.
  return level === 'calm' && sinceLast >= 1000 / CALM_FPS - 1000 / 120;
}

/** How far the cards drift, CSS pixels, and how long one drift takes, ms. */
const FLOAT_PX = 3;
const FLOAT_MS = 6000;

/**
 * Vertical offset of card `index` at time `t` (ms) while the cards float in full motion. Each card
 * has its own period and phase, so they never move in step.
 */
export function floatOffset(t: number, index: number): number {
  const period = FLOAT_MS + index * 700;
  return FLOAT_PX * Math.sin((2 * Math.PI * t) / period + index * 1.3);
}
