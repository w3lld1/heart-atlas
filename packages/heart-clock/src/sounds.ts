import type { Beat } from './clock.ts';

/** S2 is the aortic component of the second sound; P2 is its pulmonary component when split. */
export type HeartSound = 'S1' | 'S2' | 'P2';

export interface SoundEvent {
  sound: HeartSound;
  /** Absolute clock time, ms. */
  time: number;
  beatIndex: number;
}

/**
 * Heart sounds of a beat: S1 when the mitral valve closes (the model puts it at the R peak) and
 * S2 when the aortic valve closes (StatPearls, "Physiology, Cardiac Cycle"). With `s2Split` the
 * pulmonary component P2 follows S2 by that many ms.
 */
export function soundEvents(beat: Beat): SoundEvent[] {
  const s2 = beat.start + beat.timing.aorticClosure;
  const events: SoundEvent[] = [
    { sound: 'S1', time: beat.start + beat.timing.rPeak, beatIndex: beat.index },
    { sound: 'S2', time: s2, beatIndex: beat.index },
  ];
  const split = beat.params.s2Split;
  if (split > 0) events.push({ sound: 'P2', time: s2 + split, beatIndex: beat.index });
  return events;
}
