import type { PresetId } from './presets.ts';
import type { Phase } from './timing.ts';

export type ChamberId = 'right-atrium' | 'left-atrium' | 'right-ventricle' | 'left-ventricle';
export type ValveId = 'tricuspid-valve' | 'mitral-valve' | 'pulmonary-valve' | 'aortic-valve';

/** What the heart is doing at one moment, for animating the 3D model. Ids follow the model. */
export interface CycleState {
  phase: Phase;
  /** Parts of the conduction system the impulse is passing through, in a fixed order. */
  excited: string[];
  /** How far each chamber is squeezed, 0 (relaxed) to 1. */
  contraction: Record<ChamberId, number>;
  /** How far each valve is open, 0 (closed) to 1. */
  valveOpen: Record<ValveId, number>;
  /** Preset the clock runs, when the page's clock knows it; a 3D model shows its disease signs. */
  preset?: PresetId;
}

/** Current state of a running clock, or null when there is none. Knows its own clock time. */
export type CycleSource = () => CycleState | null;

type Listener = (source: CycleSource | null) => void;

let current: CycleSource | null = null;
const listeners = new Set<Listener>();

/**
 * Makes `source` the page's cycle source; null removes it. There is one page-wide slot: islands on
 * a page share this module, so the heart clock island can drive a 3D viewer island. The last
 * publisher wins, and withdrawing it leaves no source even if an earlier clock is still on the
 * page; MVP pages have at most one heart clock next to a model.
 */
export function publishCycleSource(source: CycleSource | null): void {
  current = source;
  for (const listener of listeners) listener(source);
}

/** Withdraws `source` if it is still the page's source, so a stale island does not clear a newer one. */
export function withdrawCycleSource(source: CycleSource): void {
  if (current === source) publishCycleSource(null);
}

/** Calls `listener` with the current source at once and on every change; returns unsubscribe. */
export function subscribeCycleSource(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}
