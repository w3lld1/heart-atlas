import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { defaultParams, resolveParams } from '../src/params.ts';
import { presetLead, presetParams, presetRateLimits } from '../src/presets.ts';

// docs/plans/2026-10-14-heart-clock-early-repolarization.md
describe('early repolarization', () => {
  const params = presetParams('early-repolarization');
  const clock = createHeartClock(params);
  const beat = clock.beatAt(2000);
  const at = (ms: number, lead?: 'I' | 'II' | 'III') =>
    clock.ecgAt(beat.start + beat.timing.jPoint + ms, lead);

  it('raises the J point by 0.1 mV or more, below a high-risk 0.2 mV, from 40 to 180 bpm', () => {
    expect(presetLead('early-repolarization')).toBe('II');
    const [min, max] = presetRateLimits('early-repolarization');
    for (let rate = min; rate <= max; rate += 10) {
      const fast = createHeartClock({ ...params, heartRate: rate });
      const b = fast.beatAt(3000);
      const ecg = fast.ecgBetween(
        b.start + b.timing.jPoint - 5,
        b.start + b.timing.jPoint + 40,
        46,
      );
      expect(fast.ecgAt(b.start + b.timing.jPoint), `J at ${rate}`).toBeGreaterThanOrEqual(0.1);
      expect(Math.max(...ecg), `J wave at ${rate}`).toBeLessThan(0.2);
    }
  });

  it('notches the end of the QRS: the trace rises again after the S wave', () => {
    const s = Math.min(...[-25, -20, -15, -10].map((ms) => at(ms)));
    expect(s).toBeLessThan(0);
    expect(at(0) - s).toBeGreaterThan(0.15);
    // Then it slurs down into a slightly raised ST segment.
    expect(at(50)).toBeLessThan(at(0));
    expect(at(50)).toBeGreaterThan(0.03);
  });

  it('raises the J point as much in III as in II, and not in I (ST axis 90°)', () => {
    expect(at(0, 'III')).toBeGreaterThanOrEqual(0.1);
    expect(Math.abs(at(0, 'III') - at(0))).toBeLessThan(0.01);
    expect(Math.abs(at(0, 'I'))).toBeLessThan(0.01);
  });

  it('has no J wave by default and accepts 0 to 0.3 mV', () => {
    expect(defaultParams.jWave).toBe(0);
    expect(() => resolveParams({ jWave: 0.31 })).toThrow(RangeError);
    expect(() => resolveParams({ jWave: -0.01 })).toThrow(RangeError);
  });
});
