import { createHeartClock } from '@heart-atlas/heart-clock';
import { describe, expect, it } from 'vitest';
import {
  pacingSpikeMv,
  pacingSpikes,
  pxPerMs,
  pxPerMv,
  traceEcg,
} from '../src/components/heart-clock/ecg-canvas.ts';

/** A canvas context that records the vertical segments the trace draws. */
function recorder() {
  const vertical: { x: number; from: number; to: number }[] = [];
  let at = { x: 0, y: 0 };
  let moved = false;
  const context = {
    lineJoin: 'miter',
    beginPath() {},
    stroke() {},
    moveTo(x: number, y: number) {
      at = { x, y };
      moved = true;
    },
    lineTo(x: number, y: number) {
      if (moved && x === at.x) vertical.push({ x, from: at.y, to: y });
      at = { x, y };
      moved = false;
    },
  };
  return { context: context as unknown as CanvasRenderingContext2D, vertical };
}

describe('pacemaker spikes', () => {
  it('sit at the start of every paced beat inside the window', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    expect(pacingSpikes(clock, 500, 3500)).toEqual([1000, 2000, 3000]);
    expect(pacingSpikes(createHeartClock({ heartRate: 60 }), 0, 3000)).toEqual([]);
  });

  it('follow each beat, so a change mid-strip leaves earlier beats without spikes', () => {
    const clock = createHeartClock({ heartRate: 60 });
    clock.setParams({ atrialPacing: 1 }, 1500);
    const spikes = pacingSpikes(clock, 0, 4500);
    expect(spikes.length).toBeGreaterThan(0);
    expect(spikes.every((t) => t >= 1500)).toBe(true);
  });

  it('are drawn as vertical lines from the baseline, none left of the strip', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    const { context, vertical } = recorder();
    const width = 200;
    const baseline = 72;
    const now = 3100;
    traceEcg(context, clock, now, { width, pxPerMs, baseline, pxPerMv });
    const from = now - width / pxPerMs;
    const expected = pacingSpikes(clock, from, now).map((t) => width - (now - t) * pxPerMs);
    expect(expected.length).toBeGreaterThan(0);
    const spikes = vertical.filter((segment) => segment.from === baseline);
    expect(spikes.map((segment) => segment.x)).toEqual(expected);
    for (const segment of spikes) {
      expect(segment.to).toBe(baseline - pacingSpikeMv * pxPerMv);
      expect(segment.x).toBeGreaterThanOrEqual(0);
    }
  });
});
