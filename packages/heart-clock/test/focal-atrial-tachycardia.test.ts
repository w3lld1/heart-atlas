import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { cycleState } from '../src/cycle.ts';
import { presetParams } from '../src/presets.ts';

// docs/plans/2026-10-14-heart-clock-focal-atrial-tachycardia.md
describe('focal atrial tachycardia', () => {
  const clock = createHeartClock(presetParams('focal-atrial-tachycardia'));
  const beat = clock.beatAt(2000);
  const p = (lead: 'I' | 'II' | 'III') =>
    clock.ecgBetween(beat.start, beat.start + beat.timing.pDuration, 50, lead);

  it('draws P′ negative in II and III and flat in I', () => {
    expect(Math.min(...p('II'))).toBeLessThan(-0.1);
    expect(Math.max(...p('II'))).toBeLessThan(0.01);
    expect(Math.min(...p('III'))).toBeLessThan(-0.1);
    expect(Math.max(...p('I').map(Math.abs))).toBeLessThan(0.01);
  });

  it('does not light the sinus node: the focus is elsewhere', () => {
    expect(cycleState(clock, beat.start + beat.timing.pDuration / 2).excited).toEqual([]);
  });
});
