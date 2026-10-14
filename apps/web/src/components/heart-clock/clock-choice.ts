import type { HeartParams, Lead, PresetId } from '@heart-atlas/heart-clock';
import type { PresetGroup } from './preset-groups.ts';

// What the monitor island knows about its presets. Only types and small helpers, so the island
// does not load the preset table that resolves them (choices.ts, #425).

/** A preset the monitor offers, with everything the monitor needs to show it. */
export interface ClockChoice {
  id: PresetId;
  params: Readonly<HeartParams>;
  limits: readonly [min: number, max: number];
  lead: Lead;
  /** Whether the preset sets its own heart rate (`setsHeartRate`). */
  setsRate: boolean;
  /** Group in the grouped state list (`presetGroup`). */
  group: PresetGroup | null;
}

export function clamp(value: number, [min, max]: readonly [number, number]): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Heart rate after the reader switches from one choice to another, inside the next one's
 * limits: `switchedHeartRate` of the clock package, read from the resolved choices.
 */
export function switchedRate(from: ClockChoice, to: ClockChoice, rate: number): number {
  return clamp(from.setsRate || to.setsRate ? to.params.heartRate : rate, to.limits);
}
