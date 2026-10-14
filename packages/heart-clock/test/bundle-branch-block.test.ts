import { describe, expect, it } from 'vitest';
import { createHeartClock } from '../src/clock.ts';
import type { LimbLead } from '../src/leads.ts';
import { presetLead, presetParams, type PresetId } from '../src/presets.ts';

// Signs of the bundle branch block presets in leads I, II and III, from MSD Manuals, Bundle Branch
// Block and Fascicular Block, 2024. Spec: docs/plans/2026-10-14-heart-clock-bundle-branch-block.md.

/** One beat of a preset at 60 bpm, 1 ms apart, with its timing. */
function beat(id: PresetId) {
  const clock = createHeartClock({ ...presetParams(id), heartRate: 60 });
  const b = clock.beatAt(3500);
  const trace = (lead: LimbLead) =>
    Array.from(clock.ecgBetween(b.start, b.start + 999, 1000, lead));
  const qOnset = b.timing.qOnset;
  const jPoint = b.timing.jPoint;
  return { b, trace, qOnset, jPoint };
}

/** Net area of the QRS in a trace, mV·ms. */
function qrsArea(trace: readonly number[], qOnset: number, jPoint: number): number {
  return trace.slice(Math.round(qOnset), Math.round(jPoint)).reduce((sum, v) => sum + v, 0);
}

describe('bundle branch block presets', () => {
  it('draw in the limb leads', () => {
    for (const id of [
      'right-bundle-branch-block',
      'left-bundle-branch-block',
      'left-anterior-fascicular-block',
    ] as const) {
      expect(presetLead(id)).toBe('II');
    }
  });

  it('widen the QRS to 120 ms or more in bundle branch block and keep it under 120 in hemiblock', () => {
    expect(presetParams('right-bundle-branch-block').qrsDuration).toBeGreaterThanOrEqual(120);
    expect(presetParams('left-bundle-branch-block').qrsDuration).toBeGreaterThanOrEqual(120);
    const hemiblock = presetParams('left-anterior-fascicular-block').qrsDuration;
    expect(hemiblock).toBeLessThan(120);
    expect(hemiblock).toBeGreaterThan(presetParams('normal').qrsDuration);
  });

  it('right bundle branch block: S in lead I lasts more than 40 ms', () => {
    const { trace, jPoint, b } = beat('right-bundle-branch-block');
    const late = trace('I').slice(Math.round(b.timing.rPeak), Math.round(jPoint) + 20);
    expect(late.filter((v) => v < -0.05).length).toBeGreaterThan(40);
  });

  it('left bundle branch block: notched R without Q in lead I, ST and T the other way', () => {
    const { trace, qOnset, jPoint, b } = beat('left-bundle-branch-block');
    const one = trace('I');
    const qrs = one.slice(Math.round(qOnset), Math.round(jPoint));
    // No negative wave before R.
    expect(Math.min(...qrs.slice(0, qrs.length / 2))).toBeGreaterThan(-0.02);
    // Two tops.
    const tops = qrs.filter(
      (v, k) => k > 0 && v > 0.3 && v > (qrs[k - 1] ?? 0) && v >= (qrs[k + 1] ?? 0),
    );
    expect(tops).toHaveLength(2);
    // In the middle R drops by rNotch from its unnotched height (twice rAmplitude in lead I).
    const middle = qrs[Math.round(b.timing.rPeak - qOnset)] ?? NaN;
    expect(middle).toBeCloseTo(2 * 0.6 * (1 - 0.3), 1);
    // ST just after J and the T wave below the baseline in lead I.
    expect(one[Math.round(jPoint) + 20]).toBeLessThan(-0.05);
    expect(Math.min(...one.slice(Math.round(jPoint), Math.round(b.timing.tEnd)))).toBeLessThan(
      -0.4,
    );
  });

  it('left anterior fascicular block: frontal axis more negative than −45°', () => {
    const { trace, qOnset, jPoint } = beat('left-anterior-fascicular-block');
    const one = qrsArea(trace('I'), qOnset, jPoint);
    const two = qrsArea(trace('II'), qOnset, jPoint);
    const three = qrsArea(trace('III'), qOnset, jPoint);
    // aVF-like (II + III) / √3 = sin θ points straight down; I = cos θ points left.
    const axis = (Math.atan2((two + three) / Math.sqrt(3), one) * 180) / Math.PI;
    expect(axis).toBeCloseTo(-60, 0);
    expect(axis).toBeLessThan(-45);
    expect(axis).toBeGreaterThan(-90);
    expect(one).toBeGreaterThan(0);
    expect(two).toBeLessThan(0);
    // S in III is deeper than in II.
    const lowest = (lead: LimbLead) =>
      Math.min(...trace(lead).slice(Math.round(qOnset), Math.round(jPoint)));
    expect(lowest('III')).toBeLessThan(lowest('II'));
  });
});
