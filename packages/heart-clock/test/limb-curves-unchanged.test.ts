import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import { resolveParams } from '../src/params.ts';
import { presetIds, presetLead, presetParams } from '../src/presets.ts';

// Guards docs/plans/2026-10-14-heart-clock-bundle-branch-block.md: the S wave axis, width and the
// R notch change no lead I, II or III curve of an existing preset. The snapshot was taken before
// that change.

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

// Q, R and S on one unusual axis, as before the S wave had an axis of its own.
const oddAxes = { pAxis: 100, qrsAxis: -10, sAxis: -10, tAxis: 130, stAxis: 110, fAxis: 90 };

describe('existing presets', () => {
  it('keep their curves in leads I, II and III', () => {
    const result: Record<string, string[]> = {};
    for (const id of presetIds.filter((preset) => presetLead(preset) === 'II')) {
      result[id] = [presetParams(id), resolveParams(oddAxes, presetParams(id))].flatMap(
        (params) => {
          const clock = createHeartClock(params);
          return (['I', 'II', 'III'] as const).map(
            (lead) => `${lead}:${digest(clock.ecgBetween(0, 6000, 1201, lead))}`,
          );
        },
      );
    }
    expect(result).toMatchSnapshot();
  });
});
