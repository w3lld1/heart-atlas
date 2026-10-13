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
    expect(pacingSpikes(clock, 0, 4500)).toEqual([2000, 3000, 4000]);
  });

  it('are drawn as vertical lines from the baseline, none left of the strip', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    const { context, vertical } = recorder();
    const width = 200;
    const baseline = 72;
    const now = 3100;
    traceEcg(context, clock, now, { width, pxPerMs, baseline, pxPerMv });
    // The strip spans 1100–3100 ms at 0.1 px/ms: beats start at 2000 and 3000.
    const spikes = vertical.filter((segment) => segment.from === baseline);
    expect(spikes.map((segment) => segment.x)).toEqual([90, 190]);
    for (const segment of spikes) {
      expect(segment.to).toBe(baseline - pacingSpikeMv * pxPerMv);
      expect(segment.x).toBeGreaterThanOrEqual(0);
    }
  });

  it('line up with the trace while the strip is still filling from the left', () => {
    const clock = createHeartClock({ heartRate: 60, atrialPacing: 1 });
    const { context, vertical } = recorder();
    // At 500 ms only 50 px of trace exist, drawn at the right of a 200 px strip.
    traceEcg(context, clock, 500, { width: 200, pxPerMs, baseline: 72, pxPerMv });
    expect(vertical.filter((segment) => segment.from === 72).map((segment) => segment.x)).toEqual([
      150,
    ]);
  });
});
