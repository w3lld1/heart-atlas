import { createHeartClock, presetParams, type HeartClock } from '@heart-atlas/heart-clock';

/**
 * Heart rate of the player. assumption: 60 bpm, slow enough to tell the phases apart
 * (docs/plans/2026-10-13-heart-sounds.md).
 */
export const playerHeartRate = 60;

/**
 * The heart clock the player follows: the normal preset at the player's rate. It lives apart from
 * the player, so the diagram can use it before the player's code loads on the first "Listen".
 */
export function playerClock(): HeartClock {
  return createHeartClock({ ...presetParams('normal'), heartRate: playerHeartRate });
}
