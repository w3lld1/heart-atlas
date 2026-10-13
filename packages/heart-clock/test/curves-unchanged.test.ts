import { describe, expect, it } from 'vitest';
import { createHeartClock, heartRateLimits } from '../src/clock.ts';
import { presetIds, presetParams, presetRateLimits } from '../src/presets.ts';
import { soundEvents } from '../src/sounds.ts';

// Guards the promise of docs/plans/2026-10-13-heart-clock-rhythms.md: new parameters at their
// defaults change no curve at 40–180 bpm. The snapshot was taken before that change.

/** FNV-1a over the values rounded to 1e-9, so a snapshot stays small. */
function digest(values: Iterable<number>): string {
  let hash = 0x811c9dc5;
  for (const value of values) {
    for (const char of value.toFixed(9)) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
  }
  return hash.toString(16);
}

function* curves(id: (typeof presetIds)[number], heartRate: number): Generator<number> {
  const clock = createHeartClock({ ...presetParams(id), heartRate });
  for (let t = 0; t < 6000; t += 7) {
    const { ecg, phase } = clock.sample(t);
    const { lv, aorta, la, volume } = clock.hemodynamicsAt(t);
    yield ecg;
    yield lv;
    yield aorta;
    yield la;
    yield volume;
    yield phase.length;
  }
  for (const beat of clock.beatsBetween(0, 6000)) {
    for (const event of soundEvents(beat)) yield event.time;
  }
}

describe('existing presets', () => {
  it('keep their curves and heart rate limits', () => {
    const result: Record<string, unknown> = {};
    for (const id of presetIds) {
      const [min, max] = presetRateLimits(id);
      const rates = [min, 40, 47, 60, 75, 100, 137, 170, max].filter((r) => r >= min && r <= max);
      result[id] = {
        limits: heartRateLimits({ ...presetParams(id) }).map((r) => Math.max(r, 40)),
        presetLimits: [min, max],
        curves: rates.map((rate) => `${rate}:${digest(curves(id, rate))}`),
      };
    }
    expect(result).toMatchSnapshot();
  });
});
